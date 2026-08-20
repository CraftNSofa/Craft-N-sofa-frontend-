alter table public.categories
  add column if not exists image_url text,
  add column if not exists parent_id uuid references public.categories(id) on delete set null;

create index if not exists categories_parent_id_idx on public.categories(parent_id);

drop policy if exists "public can read active categories" on public.categories;
create policy "public can read active categories"
  on public.categories for select
  to anon, authenticated
  using (active = true);

-- Category images reuse the public brand-assets bucket. Existing policies restrict writes to admins.
