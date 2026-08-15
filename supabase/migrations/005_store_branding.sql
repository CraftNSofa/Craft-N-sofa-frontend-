create table if not exists public.store_settings (
  id text primary key default 'default',
  logo_url text,
  updated_at timestamptz not null default now()
);

insert into public.store_settings (id)
values ('default')
on conflict (id) do nothing;

alter table public.store_settings enable row level security;

drop policy if exists "public can read store branding" on public.store_settings;
drop policy if exists "admins manage store branding" on public.store_settings;

create policy "public can read store branding"
  on public.store_settings for select
  to public
  using (true);

create policy "admins manage store branding"
  on public.store_settings for all
  to public
  using (is_admin())
  with check (is_admin());

insert into storage.buckets (id, name, public)
values ('brand-assets', 'brand-assets', true)
on conflict (id) do update set public = true;

drop policy if exists "public can read brand assets" on storage.objects;
drop policy if exists "admins manage brand assets" on storage.objects;

do $$
begin
  create policy "public can read brand assets"
    on storage.objects for select
    to public
    using (bucket_id = 'brand-assets');
exception when duplicate_object then null;
end $$;

do $$
begin
  create policy "admins manage brand assets"
    on storage.objects for all
    to authenticated
    using (bucket_id = 'brand-assets' and is_admin())
    with check (bucket_id = 'brand-assets' and is_admin());
exception when duplicate_object then null;
end $$;

revoke all on public.store_settings from anon, authenticated;
grant select on public.store_settings to anon, authenticated;
grant insert, update, delete on public.store_settings to authenticated;
