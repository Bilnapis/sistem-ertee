begin;

create table public.announcements (
  id uuid primary key,
  title text not null check (char_length(btrim(title)) between 1 and 200 and title ~ '[^[:space:]]'),
  description text not null check (char_length(btrim(description)) between 1 and 2000 and description ~ '[^[:space:]]'),
  starts_at timestamptz not null check (isfinite(starts_at)),
  ends_at timestamptz not null check (isfinite(ends_at) and ends_at > starts_at),
  created_by uuid not null references public.profiles(id),
  updated_by uuid not null references public.profiles(id),
  archived_at timestamptz,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  submitted_payload jsonb not null
);
create index announcements_order on public.announcements (starts_at desc, id);
create index announcements_schedule on public.announcements (ends_at, starts_at) where archived_at is null;

create function app_private.announcement_active_account() returns boolean
language sql stable security definer set search_path = '' as $$
  select app_private.has_active_session() and exists (
    select 1 from public.profiles where id = auth.uid() and is_active and archived_at is null
  );
$$;
create function app_private.announcement_status(p_starts timestamptz, p_ends timestamptz, p_archived timestamptz, p_now timestamptz)
returns text language sql immutable set search_path = '' as $$
  select case when p_archived is not null then 'archived' when p_now < p_starts then 'scheduled'
    when p_now >= p_ends then 'ended' else 'active' end;
$$;
revoke all on function app_private.announcement_active_account(),
  app_private.announcement_status(timestamptz, timestamptz, timestamptz, timestamptz) from public, anon, authenticated;
grant execute on function app_private.announcement_active_account(),
  app_private.announcement_status(timestamptz, timestamptz, timestamptz, timestamptz) to authenticated;

alter table public.announcements enable row level security;
revoke all on public.announcements from public, anon, authenticated;
-- The immutable original request is only used for retry detection, never exposed to readers.
grant select (id, title, description, starts_at, ends_at, created_by, updated_by, archived_at, created_at, updated_at)
  on public.announcements to authenticated;
grant all on public.announcements to service_role;
create policy "Read current announcements or manage announcements" on public.announcements for select to authenticated
  using ((select app_private.announcement_active_account()) and ((select app_private.is_manager())
    or (archived_at is null and starts_at <= now() and ends_at > now())));

create function public.announcements_overview(p_scope text default 'active', p_search text default '',
  p_status text default 'all', p_page integer default 1, p_page_size integer default 4)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare result jsonb; server_now timestamptz := now(); next_change timestamptz;
begin
  if not app_private.announcement_active_account() or (p_scope = 'manage' and not app_private.is_manager()) then
    raise exception 'ACCESS_DENIED' using errcode = '42501';
  end if;
  if p_scope is null or p_scope not in ('active', 'manage') or p_search is null or char_length(p_search) > 200
    or p_status is null or p_status not in ('all', 'scheduled', 'active', 'ended', 'archived')
    or p_page is null or p_page not between 1 and 1000000 or p_page_size is null or p_page_size not in (3, 4) then
    raise exception 'INVALID_ANNOUNCEMENT_INPUT' using errcode = '22023';
  end if;
  -- Only a timestamp is returned for hidden future records, never their content or IDs.
  select min(t.boundary) into next_change from public.announcements a
    cross join lateral (values (a.starts_at), (a.ends_at)) t(boundary)
    where a.archived_at is null and t.boundary > server_now;
  with matches as (
    select a.* from public.announcements a where
      (p_scope = 'manage' or (a.archived_at is null and a.starts_at <= server_now and a.ends_at > server_now))
      and (p_status = 'all' or app_private.announcement_status(a.starts_at, a.ends_at, a.archived_at, server_now) = p_status)
      and strpos(lower(a.title), lower(btrim(p_search))) > 0
  ), numbered as (
    select m.*, row_number() over (order by starts_at desc, id) as row_num from matches m
  )
  select jsonb_build_object('items', coalesce((select jsonb_agg(to_jsonb(n) - array['submitted_payload', 'row_num'] order by row_num)
    from numbered n where row_num > (p_page - 1) * p_page_size and row_num <= p_page * p_page_size), '[]'::jsonb),
    'total', (select count(*) from matches), 'server_now', server_now, 'next_change_at', next_change) into result;
  return result;
end;
$$;

create function public.announcement_detail(p_id uuid, p_scope text default 'active') returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare result jsonb; server_now timestamptz := now();
begin
  if not app_private.announcement_active_account() or (p_scope = 'manage' and not app_private.is_manager()) then
    raise exception 'ACCESS_DENIED' using errcode = '42501';
  end if;
  if p_scope is null or p_scope not in ('active', 'manage') then
    raise exception 'INVALID_ANNOUNCEMENT_INPUT' using errcode = '22023';
  end if;
  select jsonb_build_object('announcement', to_jsonb(a), 'server_now', server_now,
    'next_change_at', case when a.archived_at is not null then null when a.starts_at > server_now then a.starts_at
      when a.ends_at > server_now then a.ends_at else null end) into result
    from (select id, title, description, starts_at, ends_at, created_by, updated_by, archived_at, created_at, updated_at
      from public.announcements where id = p_id and (p_scope = 'manage'
        or (archived_at is null and starts_at <= server_now and ends_at > server_now))) a;
  if result is null then raise exception 'ANNOUNCEMENT_NOT_FOUND' using errcode = 'P0002'; end if;
  return result;
end;
$$;

create function public.create_announcement(p_request_id uuid, p_title text, p_description text, p_starts_at timestamptz, p_ends_at timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare account public.profiles; existing public.announcements; result public.announcements; payload jsonb;
begin
  if not app_private.is_manager() then raise exception 'ACCESS_DENIED' using errcode = '42501'; end if;
  select * into account from public.profiles where id = auth.uid() for share;
  if not account.is_active or account.archived_at is not null or account.role not in ('ketua_rt', 'pengurus_rt') then
    raise exception 'ACCESS_DENIED' using errcode = '42501';
  end if;
  if p_request_id is null then raise exception 'INVALID_ANNOUNCEMENT_INPUT' using errcode = '22023'; end if;
  payload := jsonb_build_object('title', btrim(p_title), 'description', btrim(p_description), 'starts_at', p_starts_at, 'ends_at', p_ends_at);
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text, 74120501));
  select * into existing from public.announcements where id = p_request_id;
  if found then
    if existing.created_by <> account.id or existing.submitted_payload <> payload then
      raise exception 'ANNOUNCEMENT_REQUEST_CONFLICT' using errcode = '22023';
    end if;
    return to_jsonb(existing) - 'submitted_payload';
  end if;
  if p_title is null or char_length(btrim(p_title)) not between 1 and 200 or p_title !~ '[^[:space:]]'
    or p_description is null or char_length(btrim(p_description)) not between 1 and 2000 or p_description !~ '[^[:space:]]'
    or p_starts_at is null or p_ends_at is null or not isfinite(p_starts_at) or not isfinite(p_ends_at)
    or p_ends_at <= p_starts_at then raise exception 'INVALID_ANNOUNCEMENT_INPUT' using errcode = '22023'; end if;
  if p_ends_at <= clock_timestamp() then raise exception 'ANNOUNCEMENT_END_PASSED' using errcode = '22023'; end if;
  insert into public.announcements(id, title, description, starts_at, ends_at, created_by, updated_by, submitted_payload)
    values (p_request_id, btrim(p_title), btrim(p_description), p_starts_at, p_ends_at, account.id, account.id, payload) returning * into result;
  return to_jsonb(result) - 'submitted_payload';
end;
$$;

create function public.update_announcement(p_id uuid, p_title text, p_description text, p_starts_at timestamptz,
  p_ends_at timestamptz, p_expected_updated_at timestamptz, p_republish boolean default false)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare account public.profiles; current_announcement public.announcements; result public.announcements;
begin
  if not app_private.is_manager() then raise exception 'ACCESS_DENIED' using errcode = '42501'; end if;
  select * into account from public.profiles where id = auth.uid() for share;
  if not account.is_active or account.archived_at is not null or account.role not in ('ketua_rt', 'pengurus_rt') then
    raise exception 'ACCESS_DENIED' using errcode = '42501';
  end if;
  select * into current_announcement from public.announcements where id = p_id for update;
  if not found then raise exception 'ANNOUNCEMENT_NOT_FOUND' using errcode = 'P0002'; end if;
  if p_expected_updated_at is distinct from current_announcement.updated_at then raise exception 'STALE_ANNOUNCEMENT' using errcode = '40001'; end if;
  if p_republish is null or p_republish <> (current_announcement.archived_at is not null) then
    raise exception 'INVALID_ANNOUNCEMENT_ACTION' using errcode = '22023';
  end if;
  if p_title is null or char_length(btrim(p_title)) not between 1 and 200 or p_title !~ '[^[:space:]]'
    or p_description is null or char_length(btrim(p_description)) not between 1 and 2000 or p_description !~ '[^[:space:]]'
    or p_starts_at is null or p_ends_at is null or not isfinite(p_starts_at) or not isfinite(p_ends_at)
    or p_ends_at <= p_starts_at then raise exception 'INVALID_ANNOUNCEMENT_INPUT' using errcode = '22023'; end if;
  if p_republish and p_ends_at <= clock_timestamp() then raise exception 'ANNOUNCEMENT_END_PASSED' using errcode = '22023'; end if;
  update public.announcements set title = btrim(p_title), description = btrim(p_description), starts_at = p_starts_at,
    ends_at = p_ends_at, archived_at = null, updated_by = account.id,
    updated_at = greatest(clock_timestamp(), current_announcement.updated_at + interval '1 microsecond')
    where id = p_id returning * into result;
  return to_jsonb(result) - 'submitted_payload';
end;
$$;

create function public.archive_announcement(p_id uuid, p_expected_updated_at timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare account public.profiles; current_announcement public.announcements; result public.announcements;
begin
  if not app_private.is_manager() then raise exception 'ACCESS_DENIED' using errcode = '42501'; end if;
  select * into account from public.profiles where id = auth.uid() for share;
  if not account.is_active or account.archived_at is not null or account.role not in ('ketua_rt', 'pengurus_rt') then
    raise exception 'ACCESS_DENIED' using errcode = '42501';
  end if;
  select * into current_announcement from public.announcements where id = p_id for update;
  if not found then raise exception 'ANNOUNCEMENT_NOT_FOUND' using errcode = 'P0002'; end if;
  if p_expected_updated_at is distinct from current_announcement.updated_at then raise exception 'STALE_ANNOUNCEMENT' using errcode = '40001'; end if;
  if current_announcement.archived_at is not null then return to_jsonb(current_announcement) - 'submitted_payload'; end if;
  update public.announcements set archived_at = clock_timestamp(), updated_by = account.id,
    updated_at = greatest(clock_timestamp(), current_announcement.updated_at + interval '1 microsecond')
    where id = p_id returning * into result;
  return to_jsonb(result) - 'submitted_payload';
end;
$$;

revoke all on function public.announcements_overview(text, text, text, integer, integer), public.announcement_detail(uuid, text),
  public.create_announcement(uuid, text, text, timestamptz, timestamptz),
  public.update_announcement(uuid, text, text, timestamptz, timestamptz, timestamptz, boolean),
  public.archive_announcement(uuid, timestamptz) from public, anon, authenticated;
grant execute on function public.announcements_overview(text, text, text, integer, integer), public.announcement_detail(uuid, text),
  public.create_announcement(uuid, text, text, timestamptz, timestamptz),
  public.update_announcement(uuid, text, text, timestamptz, timestamptz, timestamptz, boolean),
  public.archive_announcement(uuid, timestamptz) to authenticated;

commit;
