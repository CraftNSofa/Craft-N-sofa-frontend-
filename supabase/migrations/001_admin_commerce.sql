-- Craft N Sofa commerce foundation
-- Run after enabling Supabase Auth. Admin users must have app_metadata.role = 'admin'.

create extension if not exists pgcrypto;

create or replace function public.is_admin()
returns boolean
language sql stable security definer set search_path = public
as $$ select coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false); $$;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products add column if not exists category_id uuid references public.categories(id) on delete set null;
alter table public.products add column if not exists cost_price numeric(12,2) not null default 0;
alter table public.products add column if not exists published boolean not null default true;

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique,
  customer_name text not null,
  customer_email text,
  customer_phone text,
  shipping_address jsonb not null default '{}'::jsonb,
  status text not null default 'pending' check (status in ('pending','confirmed','processing','shipped','delivered','cancelled','refunded')),
  payment_status text not null default 'pending' check (payment_status in ('pending','paid','failed','refunded')),
  currency text not null default 'INR',
  subtotal numeric(12,2) not null default 0,
  shipping_fee numeric(12,2) not null default 0,
  discount numeric(12,2) not null default 0,
  total numeric(12,2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id bigint references public.products(id) on delete set null,
  product_name text not null,
  quantity integer not null check (quantity > 0),
  selling_price numeric(12,2) not null default 0,
  cost_price numeric(12,2) not null default 0,
  line_total numeric(12,2) generated always as (quantity * selling_price) stored,
  line_cost numeric(12,2) generated always as (quantity * cost_price) stored,
  created_at timestamptz not null default now()
);

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  from_status text,
  to_status text not null,
  changed_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

create table if not exists public.expenses (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  category text not null default 'operations',
  amount numeric(12,2) not null check (amount >= 0),
  expense_date date not null default current_date,
  notes text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.ledger_entries (
  id uuid primary key default gen_random_uuid(),
  order_id uuid references public.orders(id) on delete set null,
  expense_id uuid references public.expenses(id) on delete set null,
  entry_type text not null check (entry_type in ('revenue','product_cost','expense','refund')),
  amount numeric(12,2) not null,
  currency text not null default 'INR',
  entry_date date not null default current_date,
  description text,
  created_at timestamptz not null default now()
);

create index if not exists orders_status_created_idx on public.orders(status, created_at desc);
create index if not exists order_items_order_idx on public.order_items(order_id);
create index if not exists expenses_date_idx on public.expenses(expense_date desc);
create index if not exists ledger_date_type_idx on public.ledger_entries(entry_date desc, entry_type);

-- Remove policies from the original scaffold that granted unrestricted writes.
drop policy if exists "Allow public read access to products" on public.products;
drop policy if exists "Allow full access for admin users" on public.products;

alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.order_status_history enable row level security;
alter table public.expenses enable row level security;
alter table public.ledger_entries enable row level security;

-- Public storefronts can read only active/published catalogue data.
create policy "public can read active categories" on public.categories for select using (active = true);
create policy "public can read published products" on public.products for select using (published = true);

-- All operational and financial reads/writes are admin-only.
create policy "admins manage categories" on public.categories for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage products" on public.products for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage orders" on public.orders for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage order items" on public.order_items for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage order history" on public.order_status_history for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage expenses" on public.expenses for all using (public.is_admin()) with check (public.is_admin());
create policy "admins manage ledger" on public.ledger_entries for all using (public.is_admin()) with check (public.is_admin());

-- Replace the old unrestricted product/storage policies before using production data.
-- Storage object paths should be namespaced by authenticated user or product ID, and writes should
-- be restricted to public.is_admin() in the storage.objects policies for the product-images bucket.
