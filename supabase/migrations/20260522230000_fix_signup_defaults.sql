-- Update the auth trigger so new self-signup users default to "Cell Leader"
-- instead of "Cell Leader / Assistant HOD". The application normalizes both
-- to the same leadership level at runtime.

create or replace function public.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (
    id,
    email,
    designation,
    full_name,
    avatar_url,
    role,
    organization_id,
    onboarding_completed,
    created_at
  )
  values (
    new.id,
    new.email,
    coalesce(nullif(btrim(new.raw_user_meta_data->>'designation'), ''), 'None'),
    coalesce(nullif(btrim(new.raw_user_meta_data->>'full_name'), ''), new.email),
    nullif(btrim(new.raw_user_meta_data->>'avatar_url'), ''),
    coalesce(
      nullif(btrim(new.raw_user_meta_data->>'role'), ''),
      case
        when exists (select 1 from public.users) then 'Cell Leader'
        else 'Platform Super Admin'
      end
    ),
    null,
    false,
    timezone('utc'::text, now())
  )
  on conflict (id) do update
    set
      email           = excluded.email,
      designation     = coalesce(nullif(btrim(public.users.designation), ''), excluded.designation),
      full_name       = coalesce(nullif(btrim(public.users.full_name), ''), excluded.full_name),
      avatar_url      = coalesce(public.users.avatar_url, excluded.avatar_url),
      role            = case
                          when public.users.role in ('Super Admin', 'Admin') then 'Platform Super Admin'
                          else coalesce(nullif(btrim(public.users.role), ''), excluded.role)
                        end,
      organization_id = public.users.organization_id;

  return new;
end;
$$;

-- Ensure the trigger is attached (idempotent).
drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();
