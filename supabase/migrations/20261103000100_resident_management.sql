begin;

alter table public.profiles
  add column family_card_number text check (family_card_number is null or family_card_number ~ '^[0-9]{16}$'),
  add column gender text check (gender in ('laki_laki', 'perempuan')),
  add column marital_status text check (marital_status in ('belum_menikah', 'menikah')),
  add column house_number text check (house_number is null or char_length(btrim(house_number)) between 1 and 30),
  add column reviewed_by uuid references public.profiles(id),
  add column reviewed_at timestamptz,
  add column review_note text check (char_length(review_note) <= 2000),
  add column archived_at timestamptz,
  add column created_by uuid references public.profiles(id),
  add constraint archived_profiles_are_inactive check (archived_at is null or not is_active);

create index profiles_directory_order on public.profiles (created_at desc, id);
create index profiles_verification on public.profiles (verification_status) where archived_at is null;

create function app_private.is_manager() returns boolean
language sql stable security definer set search_path = '' as $$
  select app_private.has_active_session() and exists (
    select 1 from public.profiles where id = auth.uid() and is_active
      and archived_at is null and role in ('ketua_rt', 'pengurus_rt')
  );
$$;
revoke all on function app_private.is_manager() from public, anon, authenticated;
grant execute on function app_private.is_manager() to authenticated;

drop policy "Active residents read own profile" on public.profiles;
create policy "Residents read own profile; managers read directory" on public.profiles
  for select to authenticated using (
    (select app_private.has_active_session()) and (
      (id = (select auth.uid()) and is_active and archived_at is null)
      or (select app_private.is_manager())
    )
  );

create table public.resident_events (
  id bigint generated always as identity primary key,
  profile_id uuid not null references public.profiles(id),
  actor_id uuid references public.profiles(id),
  actor_name text,
  action text not null,
  details jsonb not null default '{}',
  occurred_at timestamptz not null default now()
);
alter table public.resident_events enable row level security;
revoke all on public.resident_events from public, anon, authenticated;
grant select on public.resident_events to authenticated;
grant all on public.resident_events to service_role;
create index resident_events_profile on public.resident_events (profile_id, occurred_at desc, id desc);
create policy "Read permitted resident history" on public.resident_events for select to authenticated
using ((select app_private.has_active_session()) and (
  (select app_private.is_manager()) or (profile_id = (select auth.uid()) and exists (
    select 1 from public.profiles where id = auth.uid() and is_active and archived_at is null
  ))
));

create function app_private.require_complete_profile(p public.profiles) returns void
language plpgsql set search_path = '' as $$
begin
  if p.family_card_number is null or p.gender is null or p.marital_status is null
    or p.full_name is null or p.nik is null or p.phone is null or p.address is null or p.house_block is null then
    raise exception 'INCOMPLETE_PROFILE' using errcode = '22023';
  end if;
end;
$$;
revoke all on function app_private.require_complete_profile(public.profiles) from public, anon, authenticated;

create or replace function app_private.stamp_profile_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := clock_timestamp();
  if row(new.full_name, new.nik, new.phone, new.address, new.house_block, new.family_card_number,
    new.gender, new.marital_status, new.house_number) is distinct from
    row(old.full_name, old.nik, old.phone, old.address, old.house_block, old.family_card_number,
    old.gender, old.marital_status, old.house_number) then
    new.verification_status := 'menunggu_verifikasi';
    new.reviewed_by := null;
    new.reviewed_at := null;
    new.review_note := null;
  end if;
  -- All access mutations serialize on this key, including direct administrative SQL.
  if old.role in ('ketua_rt', 'pengurus_rt') and old.is_active and old.archived_at is null
    and (new.role = 'warga' or not new.is_active or new.archived_at is not null) then
    perform pg_advisory_xact_lock(74120408);
    if not exists (select 1 from public.profiles where id <> old.id and is_active
      and archived_at is null and role in ('ketua_rt', 'pengurus_rt')) then
      raise exception 'LAST_ACTIVE_MANAGER' using errcode = '23514';
    end if;
  end if;
  return new;
end;
$$;

create function app_private.record_resident_event() returns trigger
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); actor_label text;
begin
  if tg_op = 'INSERT' then
    select full_name into actor_label from public.profiles where id = coalesce(new.created_by, new.id);
    insert into public.resident_events(profile_id, actor_id, actor_name, action)
      values (new.id, coalesce(new.created_by, new.id), actor_label, 'created');
    return new;
  end if;
  select full_name into actor_label from public.profiles where id = actor;
  if row(new.full_name, new.nik, new.phone, new.address, new.house_block, new.family_card_number,
    new.gender, new.marital_status, new.house_number) is distinct from
    row(old.full_name, old.nik, old.phone, old.address, old.house_block, old.family_card_number,
    old.gender, old.marital_status, old.house_number) then
    insert into public.resident_events(profile_id, actor_id, actor_name, action) values (new.id, actor, actor_label, 'profile_updated');
  end if;
  if row(new.role, new.is_active, new.archived_at) is distinct from row(old.role, old.is_active, old.archived_at) then
    insert into public.resident_events(profile_id, actor_id, actor_name, action, details) values (new.id, actor, actor_label,
      case when new.archived_at is distinct from old.archived_at
        then case when new.archived_at is null then 'restored' else 'archived' end else 'access_updated' end,
      jsonb_build_object('previous_role', old.role, 'role', new.role, 'is_active', new.is_active));
  end if;
  if row(new.verification_status, new.reviewed_at) is distinct from row(old.verification_status, old.reviewed_at) then
    insert into public.resident_events(profile_id, actor_id, actor_name, action, details) values (new.id, actor, actor_label, 'reviewed',
      jsonb_build_object('status', new.verification_status, 'note', new.review_note));
  end if;
  return new;
end;
$$;
revoke all on function app_private.record_resident_event() from public, anon, authenticated;
create trigger after_resident_change after insert or update on public.profiles
  for each row execute function app_private.record_resident_event();

-- Only Auth's server-controlled app_metadata can request manager provisioning.
-- Public signup user_metadata never supplies role, account state, or reviewer.
create or replace function app_private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
declare
  trusted jsonb := new.raw_app_meta_data -> 'ertee_creation';
  actor uuid;
  requested_role text := 'warga';
  requested_active boolean := true;
  p public.profiles;
begin
  if trusted is not null then
    perform pg_advisory_xact_lock(74120408);
    actor := (trusted ->> 'actor_id')::uuid;
    if not exists (select 1 from public.profiles a join auth.sessions s on s.user_id = a.id
      where a.id = actor and a.is_active and a.archived_at is null
        and a.role in ('ketua_rt', 'pengurus_rt') and s.id = (trusted ->> 'session_id')::uuid) then
      raise exception 'ACCESS_DENIED' using errcode = '42501';
    end if;
    requested_role := trusted ->> 'role';
    requested_active := (trusted ->> 'is_active')::boolean;
  end if;
  insert into public.profiles(id, email, full_name, nik, phone, address, house_block,
    family_card_number, gender, marital_status, house_number, role, is_active, created_by)
  values (new.id, new.email, btrim(new.raw_user_meta_data ->> 'full_name'),
    btrim(new.raw_user_meta_data ->> 'nik'), btrim(new.raw_user_meta_data ->> 'phone'),
    btrim(new.raw_user_meta_data ->> 'address'), btrim(new.raw_user_meta_data ->> 'house_block'),
    nullif(btrim(new.raw_user_meta_data ->> 'family_card_number'), ''),
    nullif(new.raw_user_meta_data ->> 'gender', ''), nullif(new.raw_user_meta_data ->> 'marital_status', ''),
    nullif(btrim(new.raw_user_meta_data ->> 'house_number'), ''), requested_role, requested_active, actor)
  returning * into p;
  if trusted is not null then perform app_private.require_complete_profile(p); end if;
  return new;
end;
$$;

create function public.resident_management_access() returns boolean
language sql stable security definer set search_path = '' as $$ select app_private.is_manager(); $$;

create function public.update_resident(p_id uuid, p_data jsonb, p_expected_updated_at timestamptz)
returns public.profiles language plpgsql security definer set search_path = '' as $$
declare p public.profiles; manager boolean; key text;
begin
  perform pg_advisory_xact_lock(74120408);
  manager := app_private.is_manager();
  if not app_private.has_active_session() or not exists (select 1 from public.profiles
    where id = auth.uid() and is_active and archived_at is null) or (not manager and p_id <> auth.uid()) then
    raise exception 'ACCESS_DENIED' using errcode = '42501';
  end if;
  if jsonb_typeof(p_data) is distinct from 'object' then raise exception 'INVALID_INPUT' using errcode = '22023'; end if;
  for key in select jsonb_object_keys(p_data) loop
    if key not in ('full_name', 'nik', 'phone', 'address', 'house_block', 'family_card_number',
      'gender', 'marital_status', 'house_number') and not (manager and key in ('role', 'is_active')) then
      raise exception 'ACCESS_DENIED' using errcode = '42501';
    end if;
  end loop;
  select * into p from public.profiles where id = p_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  if p.updated_at is distinct from p_expected_updated_at then raise exception 'STALE_PROFILE' using errcode = '40001'; end if;
  if p.archived_at is not null then raise exception 'RESIDENT_ARCHIVED' using errcode = '22023'; end if;
  select * into p from jsonb_populate_record(p, p_data);
  if p_data ?| array['full_name', 'nik', 'phone', 'address', 'house_block', 'family_card_number',
    'gender', 'marital_status', 'house_number'] then
    perform app_private.require_complete_profile(p);
  end if;
  update public.profiles set full_name = btrim(p.full_name), nik = btrim(p.nik), phone = btrim(p.phone),
    address = btrim(p.address), house_block = btrim(p.house_block), family_card_number = p.family_card_number,
    gender = p.gender, marital_status = p.marital_status, house_number = nullif(btrim(p.house_number), ''),
    role = p.role, is_active = p.is_active where id = p_id returning * into p;
  return p;
end;
$$;

create function public.review_resident(p_id uuid, p_status text, p_note text, p_expected_updated_at timestamptz)
returns public.profiles language plpgsql security definer set search_path = '' as $$
declare p public.profiles;
begin
  perform pg_advisory_xact_lock(74120408);
  if not app_private.is_manager() then raise exception 'ACCESS_DENIED' using errcode = '42501'; end if;
  select * into p from public.profiles where id = p_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  if p.updated_at is distinct from p_expected_updated_at then raise exception 'STALE_PROFILE' using errcode = '40001'; end if;
  if p.archived_at is not null then raise exception 'RESIDENT_ARCHIVED' using errcode = '22023'; end if;
  if p_status not in ('terverifikasi', 'perlu_perbaikan') or p_status is null then
    raise exception 'INVALID_INPUT' using errcode = '22023';
  end if;
  if p_status = 'terverifikasi' then perform app_private.require_complete_profile(p); end if;
  if p_status = 'perlu_perbaikan' and coalesce(char_length(btrim(p_note)), 0) = 0 then
    raise exception 'REVIEW_NOTE_REQUIRED' using errcode = '22023';
  end if;
  update public.profiles set verification_status = p_status, review_note = nullif(btrim(p_note), ''),
    reviewed_by = auth.uid(), reviewed_at = clock_timestamp() where id = p_id returning * into p;
  return p;
end;
$$;

create function public.set_resident_archive(p_id uuid, p_archived boolean, p_expected_updated_at timestamptz)
returns public.profiles language plpgsql security definer set search_path = '' as $$
declare p public.profiles;
begin
  perform pg_advisory_xact_lock(74120408);
  if not app_private.is_manager() then raise exception 'ACCESS_DENIED' using errcode = '42501'; end if;
  select * into p from public.profiles where id = p_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  if p.updated_at is distinct from p_expected_updated_at then raise exception 'STALE_PROFILE' using errcode = '40001'; end if;
  if p_archived is null then raise exception 'INVALID_INPUT' using errcode = '22023'; end if;
  update public.profiles set archived_at = case when p_archived then coalesce(archived_at, now()) else null end,
    is_active = false where id = p_id returning * into p;
  return p;
end;
$$;

create function public.resident_summary() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  if not app_private.is_manager() then raise exception 'ACCESS_DENIED' using errcode = '42501'; end if;
  return (select jsonb_build_object('total', count(*),
    'menunggu_verifikasi', count(*) filter (where verification_status = 'menunggu_verifikasi'),
    'terverifikasi', count(*) filter (where verification_status = 'terverifikasi'),
    'perlu_perbaikan', count(*) filter (where verification_status = 'perlu_perbaikan'))
    from public.profiles where archived_at is null);
end;
$$;

create function public.list_residents(p_search text default '', p_status text default 'all', p_role text default 'all',
  p_verification text default 'all', p_sort text default 'newest', p_page integer default 1)
returns jsonb language plpgsql stable security definer set search_path = '' as $$
begin
  if not app_private.is_manager() then raise exception 'ACCESS_DENIED' using errcode = '42501'; end if;
  if p_page is null or p_page < 1 or p_page > 1000000 or char_length(p_search) > 200
    or p_status is null or p_status not in ('all', 'active', 'inactive', 'archived')
    or p_role is null or p_role not in ('all', 'ketua_rt', 'pengurus_rt', 'warga')
    or p_verification is null or p_verification not in ('all', 'menunggu_verifikasi', 'terverifikasi', 'perlu_perbaikan')
    or p_sort is null or p_sort not in ('newest', 'name') then
    raise exception 'INVALID_INPUT' using errcode = '22023';
  end if;
  return (with filtered as (
    select * from public.profiles where
      (case p_status when 'archived' then archived_at is not null else archived_at is null end)
      and (p_status not in ('active', 'inactive') or is_active = (p_status = 'active'))
      and (p_role = 'all' or role = p_role)
      and (p_verification = 'all' or verification_status = p_verification)
      and (coalesce(btrim(p_search), '') = '' or strpos(lower(full_name), lower(btrim(p_search))) > 0
        or strpos(nik, btrim(p_search)) > 0 or strpos(lower(coalesce(house_number, '')), lower(btrim(p_search))) > 0
        or strpos(lower(house_block), lower(btrim(p_search))) > 0)
  ), page as (
    select * from filtered order by case when p_sort = 'name' then lower(full_name) end,
      case when p_sort = 'newest' then created_at end desc, id limit 10 offset (p_page - 1) * 10
  ) select jsonb_build_object('items', coalesce((select jsonb_agg(to_jsonb(page) order by
    case when p_sort = 'name' then lower(page.full_name) end,
    case when p_sort = 'newest' then page.created_at end desc, page.id) from page), '[]'::jsonb),
    'total', (select count(*) from filtered)));
end;
$$;

revoke all on function public.resident_management_access() from public, anon, authenticated;
revoke all on function public.update_resident(uuid, jsonb, timestamptz) from public, anon, authenticated;
revoke all on function public.review_resident(uuid, text, text, timestamptz) from public, anon, authenticated;
revoke all on function public.set_resident_archive(uuid, boolean, timestamptz) from public, anon, authenticated;
revoke all on function public.resident_summary() from public, anon, authenticated;
revoke all on function public.list_residents(text, text, text, text, text, integer) from public, anon, authenticated;
grant execute on function public.resident_management_access(), public.update_resident(uuid, jsonb, timestamptz),
  public.review_resident(uuid, text, text, timestamptz), public.set_resident_archive(uuid, boolean, timestamptz),
  public.resident_summary(), public.list_residents(text, text, text, text, text, integer) to authenticated;

commit;
