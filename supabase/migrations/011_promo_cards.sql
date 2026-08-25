alter table public.store_settings
  add column if not exists promo_cards jsonb not null default '[]'::jsonb;

update public.store_settings
set promo_cards = '[]'::jsonb
where promo_cards is null;

create index if not exists store_settings_promo_cards_idx
  on public.store_settings using gin (promo_cards);

comment on column public.store_settings.promo_cards is 'Ordered storefront promotional collection cards managed from the admin workspace';
