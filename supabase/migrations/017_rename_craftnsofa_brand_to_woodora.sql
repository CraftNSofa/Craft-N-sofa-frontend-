-- Rename existing stored brand labels without changing product or order data.
update public.store_settings
set secondary_image_title = 'Woodora collection'
where id = 'default'
  and secondary_image_title = 'Craft N Sofa collection';

update public.store_banners
set alt_text = 'Woodora collection'
where alt_text = 'Craft N Sofa collection';
