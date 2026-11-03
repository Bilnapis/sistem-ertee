-- Tahap 1: autentikasi warga. Semua identitas pengembangan wajib dummy.
begin;

create schema if not exists app_private;
revoke all on schema app_private from public, anon, authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  full_name text not null check (char_length(btrim(full_name)) between 2 and 150),
  nik text not null unique check (nik ~ '^[0-9]{16}$'),
  phone text not null check (phone ~ '^(0|[+]?62)8[0-9]{7,12}$'),
  address text not null check (char_length(btrim(address)) between 5 and 500),
  house_block text not null check (char_length(btrim(house_block)) between 1 and 50),
  role text not null default 'warga' check (role in ('warga', 'ketua_rt', 'pengurus_rt')),
  is_active boolean not null default true,
  verification_status text not null default 'menunggu_verifikasi'
    check (verification_status in ('menunggu_verifikasi', 'terverifikasi', 'perlu_perbaikan')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;
revoke all on public.profiles from public, anon, authenticated;
grant select on public.profiles to authenticated;
grant all on public.profiles to service_role;

-- Supabase JWTs otherwise remain valid until expiry after logout. Check the
-- corresponding live Auth session to deny replay immediately after signOut.
create function app_private.has_active_session()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from auth.sessions
    where id = nullif(auth.jwt() ->> 'session_id', '')::uuid
      and user_id = auth.uid()
  );
$$;
revoke all on function app_private.has_active_session() from public, anon, authenticated;
grant execute on function app_private.has_active_session() to authenticated;

-- The token owner can only read their active profile, including via direct REST.
-- No browser INSERT/UPDATE/DELETE privileges; metadata is never an authority.
create policy "Active residents read own profile"
  on public.profiles for select to authenticated
  using (id = (select auth.uid()) and is_active = true and (select app_private.has_active_session()));

create function app_private.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, email, full_name, nik, phone, address, house_block, role, is_active, verification_status)
  values (
    new.id,
    new.email,
    btrim(new.raw_user_meta_data ->> 'full_name'),
    btrim(new.raw_user_meta_data ->> 'nik'),
    btrim(new.raw_user_meta_data ->> 'phone'),
    btrim(new.raw_user_meta_data ->> 'address'),
    btrim(new.raw_user_meta_data ->> 'house_block'),
    'warga', true, 'menunggu_verifikasi'
  );
  return new;
end;
$$;
revoke all on function app_private.handle_new_user() from public, anon, authenticated;

-- The Auth user and profile are committed atomically; invalid identity rolls back signup.
create trigger on_auth_user_created after insert on auth.users
  for each row execute function app_private.handle_new_user();

create function app_private.sync_user_email()
returns trigger language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set email = new.email where id = new.id;
  return new;
end;
$$;
revoke all on function app_private.sync_user_email() from public, anon, authenticated;
create trigger on_auth_user_email_updated after update of email on auth.users
  for each row when (old.email is distinct from new.email)
  execute function app_private.sync_user_email();

create function app_private.stamp_profile_update()
returns trigger language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  if row(new.full_name, new.nik, new.phone, new.address, new.house_block)
    is distinct from row(old.full_name, old.nik, old.phone, old.address, old.house_block) then
    new.verification_status := 'menunggu_verifikasi';
  end if;
  return new;
end;
$$;
revoke all on function app_private.stamp_profile_update() from public, anon, authenticated;
create trigger before_profile_update before update on public.profiles
  for each row execute function app_private.stamp_profile_update();

comment on table public.profiles is 'Profil warga privat. Registrasi publik selalu warga dan menunggu verifikasi. Gunakan identitas dummy.';
commit;
