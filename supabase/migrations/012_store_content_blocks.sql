-- Persist a manageable list of HTML/CSS storefront blocks and the secondary-image title.
alter table public.store_settings
  add column if not exists content_blocks jsonb not null default '[]'::jsonb,
  add column if not exists secondary_image_title text not null default 'Craft N Sofa collection';

update public.store_settings
set content_blocks = '[]'::jsonb
where content_blocks is null;

update public.store_settings
set secondary_image_title = 'Craft N Sofa collection'
where secondary_image_title is null;

comment on column public.store_settings.content_blocks is 'Ordered HTML/CSS storefront blocks with optional uploaded imagery managed from the admin workspace';
comment on column public.store_settings.secondary_image_title is 'Customer-facing title shown with the optional secondary storefront image';

create index if not exists store_settings_content_blocks_idx
  on public.store_settings using gin (content_blocks);
