-- Persist editable storefront content blocks alongside the existing default store settings row.
alter table public.store_settings
  add column if not exists custom_html text not null default '',
  add column if not exists custom_css text not null default '',
  add column if not exists secondary_image_url text;

comment on column public.store_settings.custom_html is 'Admin-authored storefront HTML content block';
comment on column public.store_settings.custom_css is 'Admin-authored storefront CSS content block';
comment on column public.store_settings.secondary_image_url is 'Optional image rendered below the rotating banner';

alter table public.store_settings enable row level security;
drop policy if exists "Public can read store content" on public.store_settings;
create policy "Public can read store content" on public.store_settings for select using (true);

drop policy if exists "Admins can update store content" on public.store_settings;
create policy "Admins can update store content" on public.store_settings for update using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

drop policy if exists "Admins can insert store content" on public.store_settings;
create policy "Admins can insert store content" on public.store_settings for insert with check (auth.role() = 'authenticated');

drop policy if exists "Public can read store settings" on public.store_settings;
create policy "Public can read store settings" on public.store_settings for select using (true);

drop policy if exists "Admins can manage store settings" on public.store_settings;
create policy "Admins can manage store settings" on public.store_settings for all using (auth.role() = 'authenticated') with check (auth.role() = 'authenticated');

grant select on public.store_settings to anon;
grant select, insert, update on public.store_settings to authenticated;
