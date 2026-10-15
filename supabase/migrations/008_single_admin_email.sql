-- Restrict every admin-only RLS policy that calls public.is_admin() to the
-- one explicitly authorized Woodora admin account.
create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select lower(coalesce(auth.jwt() ->> 'email', '')) = 'faizantrader126@gmail.com';
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;
