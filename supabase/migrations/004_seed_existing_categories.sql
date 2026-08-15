insert into public.categories (name, slug, description, active, sort_order)
select distinct on (lower(trim(p.category)))
  trim(p.category) as name,
  lower(regexp_replace(trim(p.category), '[^a-zA-Z0-9]+', '-', 'g')) as slug,
  'Imported from the existing product catalogue' as description,
  true,
  row_number() over (order by lower(trim(p.category))) - 1
from public.products p
where p.category is not null and trim(p.category) <> ''
on conflict (slug) do nothing;

update public.products p
set category_id = c.id
from public.categories c
where p.category_id is null
  and lower(trim(p.category)) = lower(trim(c.name));
