create table if not exists public.store_banners (
  id uuid primary key default gen_random_uuid(),
  image_url text not null,
  alt_text text not null default 'Craft N Sofa collection',
  active boolean not null default true,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists store_banners_active_order_idx
  on public.store_banners (active, sort_order, created_at);

create or replace function public.set_store_banners_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists store_banners_updated_at on public.store_banners;
create trigger store_banners_updated_at
before update on public.store_banners
for each row execute function public.set_store_banners_updated_at();

alter table public.store_banners enable row level security;

drop policy if exists "public can read active store banners" on public.store_banners;
drop policy if exists "admins manage store banners" on public.store_banners;

create policy "public can read active store banners"
  on public.store_banners for select
  to public
  using (active = true);

create policy "admins manage store banners"
  on public.store_banners for all
  to authenticated
  using (is_admin())
  with check (is_admin());

revoke all on public.store_banners from anon, authenticated;
grant select on public.store_banners to anon, authenticated;
grant insert, update, delete on public.store_banners to authenticated;

-- The existing public brand-assets bucket is reused for banner files.
-- Public read and admin-only writes are already enforced by 005_store_branding.sql.
