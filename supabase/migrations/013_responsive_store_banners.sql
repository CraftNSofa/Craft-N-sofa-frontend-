-- Add an optional square mobile artwork slot to the main homepage banner.
alter table public.store_banners
  add column if not exists mobile_image_url text;

comment on column public.store_banners.mobile_image_url is 'Optional square 500x500 artwork used on narrow screens for the main homepage banner';
