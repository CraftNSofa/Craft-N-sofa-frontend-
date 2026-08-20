alter table public.products
  add column if not exists tags text[] not null default '{}';

create table if not exists public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  slug text not null unique,
  description text,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.tags enable row level security;

drop policy if exists "public can read active tags" on public.tags;
drop policy if exists "admins manage tags" on public.tags;

create policy "public can read active tags"
  on public.tags for select
  using (active = true);

create policy "admins manage tags"
  on public.tags for all
  using (public.is_admin())
  with check (public.is_admin());

create index if not exists products_tags_gin_idx on public.products using gin (tags);

create or replace function public.set_tags_updated_at()
returns trigger
language plpgsql
security invoker
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tags_set_updated_at on public.tags;
create trigger tags_set_updated_at
before update on public.tags
for each row execute function public.set_tags_updated_at();
