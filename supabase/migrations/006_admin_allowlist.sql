-- Keep admin access explicit and owner-controlled.
create table if not exists public.admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);

alter table public.admin_users enable row level security;

-- Do not expose the allowlist to browser clients. The SECURITY DEFINER helper below reads it.
revoke all on table public.admin_users from anon, authenticated;

insert into public.admin_users (user_id)
values ('95b91c39-6821-488e-8f4c-bc70df86f1c3'::uuid)
on conflict (user_id) do nothing;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.admin_users where user_id = auth.uid()
  ) or coalesce((auth.jwt() -> 'app_metadata' ->> 'role') = 'admin', false);
$$;

revoke all on function public.is_admin() from public;
grant execute on function public.is_admin() to anon, authenticated;
