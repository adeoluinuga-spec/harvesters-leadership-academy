alter table public.users
  add column if not exists designation text not null default 'None';

alter table public.users
  add column if not exists role text;

alter table public.users
  add column if not exists avatar_url text;

alter table public.users
  add column if not exists created_at timestamptz not null default timezone('utc'::text, now());

alter table public.users
  alter column created_at set default timezone('utc'::text, now());

update public.users
set designation = 'None'
where designation is null or btrim(designation) = '';

update public.users
set created_at = timezone('utc'::text, now())
where created_at is null;

alter table public.users
  alter column created_at set not null;

alter table public.users enable row level security;

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'users'
      and column_name = 'id'
      and data_type = 'uuid'
  ) then
    if not exists (
      select 1
      from pg_constraint
      where conrelid = 'public.users'::regclass
        and contype = 'p'
    ) then
      alter table public.users
        add constraint users_pkey primary key (id);
    end if;

    if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.users'::regclass
      and contype = 'f'
      and conname = 'users_id_auth_users_fkey'
    ) then
      alter table public.users
        add constraint users_id_auth_users_fkey
        foreign key (id) references auth.users(id) on delete cascade;
    end if;
  end if;
end;
$$;

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
        when exists (select 1 from public.users) then 'Cell Leader / Assistant HOD'
        else 'Super Admin'
      end
    ),
    false,
    timezone('utc'::text, now())
  )
  on conflict (id) do update
    set email = excluded.email,
        designation = coalesce(nullif(btrim(public.users.designation), ''), excluded.designation),
        full_name = coalesce(public.users.full_name, excluded.full_name),
        avatar_url = coalesce(public.users.avatar_url, excluded.avatar_url),
        role = coalesce(public.users.role, excluded.role);

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_auth_user();

insert into public.users (
  id,
  email,
  designation,
  full_name,
  avatar_url,
  role,
  onboarding_completed,
  created_at
)
select
  auth_users.id,
  auth_users.email,
  coalesce(nullif(btrim(auth_users.raw_user_meta_data->>'designation'), ''), 'None'),
  coalesce(nullif(btrim(auth_users.raw_user_meta_data->>'full_name'), ''), auth_users.email),
  nullif(btrim(auth_users.raw_user_meta_data->>'avatar_url'), ''),
  coalesce(
    nullif(btrim(auth_users.raw_user_meta_data->>'role'), ''),
    case
      when row_number() over (order by auth_users.created_at, auth_users.id) = 1 then 'Super Admin'
      else 'Cell Leader / Assistant HOD'
    end
  ),
  false,
  coalesce(auth_users.created_at, timezone('utc'::text, now()))
from auth.users as auth_users
where not exists (
  select 1
  from public.users as public_users
  where public_users.id = auth_users.id
)
on conflict (id) do nothing;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'avatars',
  'avatars',
  true,
  5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can read avatar images'
  ) then
    create policy "Users can read avatar images"
      on storage.objects
      for select
      using (bucket_id = 'avatars');
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can upload own avatar images'
  ) then
    create policy "Users can upload own avatar images"
      on storage.objects
      for insert
      with check (
        bucket_id = 'avatars'
        and auth.uid()::text = (storage.foldername(name))[1]
      );
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'storage'
      and tablename = 'objects'
      and policyname = 'Users can update own avatar images'
  ) then
    create policy "Users can update own avatar images"
      on storage.objects
      for update
      using (
        bucket_id = 'avatars'
        and auth.uid()::text = (storage.foldername(name))[1]
      )
      with check (
        bucket_id = 'avatars'
        and auth.uid()::text = (storage.foldername(name))[1]
      );
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'users'
      and policyname = 'Users can read own profile'
  ) then
    create policy "Users can read own profile"
      on public.users
      for select
      using (auth.uid() = id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'users'
      and policyname = 'Users can create own profile'
  ) then
    create policy "Users can create own profile"
      on public.users
      for insert
      with check (auth.uid() = id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'users'
      and policyname = 'Users can update own profile'
  ) then
    create policy "Users can update own profile"
      on public.users
      for update
      using (auth.uid() = id)
      with check (auth.uid() = id);
  end if;
end;
$$;
