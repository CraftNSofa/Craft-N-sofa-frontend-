-- Persist the dedicated banner shown below the first homepage product carousel.
alter table public.store_settings
  add column if not exists product_banner_url text;

comment on column public.store_settings.product_banner_url is
  'Optional 1500x500 banner shown below the first homepage product carousel';
