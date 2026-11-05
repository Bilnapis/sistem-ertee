begin;

-- Dependent modules were updated before removing the profile column.
create or replace function app_private.require_complete_profile(p public.profiles) returns void
language plpgsql set search_path = '' as $$
begin
  if p.family_card_number is null or p.gender is null or p.marital_status is null
    or p.full_name is null or p.nik is null or p.phone is null or p.address is null then
    raise exception 'INCOMPLETE_PROFILE' using errcode = '22023';
  end if;
end;
$$;

create or replace function app_private.stamp_profile_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := clock_timestamp();
  if row(new.full_name, new.nik, new.phone, new.address, new.family_card_number,
    new.gender, new.marital_status) is distinct from
    row(old.full_name, old.nik, old.phone, old.address, old.family_card_number,
    old.gender, old.marital_status) then
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

create or replace function app_private.record_resident_event() returns trigger
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
  if row(new.full_name, new.nik, new.phone, new.address, new.family_card_number,
    new.gender, new.marital_status) is distinct from
    row(old.full_name, old.nik, old.phone, old.address, old.family_card_number,
    old.gender, old.marital_status) then
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
  insert into public.profiles(id, email, full_name, nik, phone, address,
    family_card_number, gender, marital_status, role, is_active, created_by)
  values (new.id, new.email, btrim(new.raw_user_meta_data ->> 'full_name'),
    btrim(new.raw_user_meta_data ->> 'nik'), btrim(new.raw_user_meta_data ->> 'phone'),
    btrim(new.raw_user_meta_data ->> 'address'),
    nullif(btrim(new.raw_user_meta_data ->> 'family_card_number'), ''),
    nullif(new.raw_user_meta_data ->> 'gender', ''), nullif(new.raw_user_meta_data ->> 'marital_status', ''),
    requested_role, requested_active, actor)
  returning * into p;
  if trusted is not null then perform app_private.require_complete_profile(p); end if;
  return new;
end;
$$;

create or replace function public.update_resident(p_id uuid, p_data jsonb, p_expected_updated_at timestamptz)
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
    if key not in ('full_name', 'nik', 'phone', 'address', 'family_card_number',
      'gender', 'marital_status') and not (manager and key in ('role', 'is_active')) then
      raise exception 'ACCESS_DENIED' using errcode = '42501';
    end if;
  end loop;
  select * into p from public.profiles where id = p_id for update;
  if not found then raise exception 'NOT_FOUND' using errcode = 'P0002'; end if;
  if p.updated_at is distinct from p_expected_updated_at then raise exception 'STALE_PROFILE' using errcode = '40001'; end if;
  if p.archived_at is not null then raise exception 'RESIDENT_ARCHIVED' using errcode = '22023'; end if;
  select * into p from jsonb_populate_record(p, p_data);
  if p_data ?| array['full_name', 'nik', 'phone', 'address', 'family_card_number',
    'gender', 'marital_status'] then
    perform app_private.require_complete_profile(p);
  end if;
  update public.profiles set full_name = btrim(p.full_name), nik = btrim(p.nik), phone = btrim(p.phone),
    address = btrim(p.address), family_card_number = p.family_card_number,
    gender = p.gender, marital_status = p.marital_status,
    role = p.role, is_active = p.is_active where id = p_id returning * into p;
  return p;
end;
$$;

create or replace function public.list_residents(p_search text default '', p_status text default 'all', p_role text default 'all',
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
        or strpos(nik, btrim(p_search)) > 0)
  ), page as (
    select * from filtered order by case when p_sort = 'name' then lower(full_name) end,
      case when p_sort = 'newest' then created_at end desc, id limit 10 offset (p_page - 1) * 10
  ) select jsonb_build_object('items', coalesce((select jsonb_agg(to_jsonb(page) order by
    case when p_sort = 'name' then lower(page.full_name) end,
    case when p_sort = 'newest' then page.created_at end desc, page.id) from page), '[]'::jsonb),
    'total', (select count(*) from filtered)));
end;
$$;

alter table public.profiles drop column house_number;

commit;
