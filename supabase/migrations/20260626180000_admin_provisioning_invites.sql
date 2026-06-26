create table if not exists public.admin_invitations (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  full_name text,
  role text not null,
  organization_id uuid references public.organizations(id) on delete cascade,
  group_id uuid references public.groups(id) on delete cascade,
  campus_id uuid references public.campuses(id) on delete cascade,
  invited_by uuid references auth.users(id) on delete set null,
  invited_auth_user_id uuid references auth.users(id) on delete set null,
  status text not null default 'sent' check (status in ('sent', 'accepted', 'cancelled', 'expired')),
  created_at timestamptz not null default timezone('utc'::text, now()),
  accepted_at timestamptz
);

create index if not exists admin_invitations_email_idx on public.admin_invitations(email);
create index if not exists admin_invitations_scope_idx on public.admin_invitations(organization_id, group_id, campus_id);
alter table public.admin_invitations enable row level security;

create policy "platform admins manage admin invitations"
  on public.admin_invitations for all to authenticated
  using (exists (select 1 from public.users where id = auth.uid() and role in ('Platform Super Admin', 'Super Admin', 'Admin')))
  with check (exists (select 1 from public.users where id = auth.uid() and role in ('Platform Super Admin', 'Super Admin', 'Admin')));
