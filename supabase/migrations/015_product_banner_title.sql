-- Persist editable text shown below the homepage product banner.
alter table public.store_settings
  add column if not exists product_banner_title text not null default 'L-Shaped Corner Set';
