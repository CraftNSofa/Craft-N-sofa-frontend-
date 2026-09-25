-- Rename the current homepage banner category title.
update public.store_settings
set product_banner_title = 'L-Shaped Corner and Sofa Set',
    updated_at = now()
where id = 'default';
