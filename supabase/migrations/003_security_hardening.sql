-- Keep the helper callable by policies but not through the public REST RPC surface.
revoke execute on function public.is_admin() from anon, authenticated;
grant execute on function public.is_admin() to service_role;

-- Harden existing trigger helpers without changing their behavior.
alter function public.sync_product_prices() set search_path = public;
alter function public.set_products_updated_at() set search_path = public;

-- These old automation helpers are not part of the storefront API.
revoke execute on function public.rls_auto_enable() from anon, authenticated;
grant execute on function public.rls_auto_enable() to service_role;
