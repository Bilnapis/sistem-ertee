begin;

create table public.complaints (
  id uuid primary key,
  number bigint generated always as identity unique,
  reference text generated always as ('ADU-' || lpad(number::text, greatest(3, length(number::text)), '0')) stored unique,
  applicant_id uuid not null references public.profiles(id),
  identity_snapshot jsonb not null,
  title text not null check (char_length(btrim(title)) between 1 and 200 and title ~ '[^[:space:]]'),
  description text not null check (char_length(btrim(description)) between 1 and 2000 and description ~ '[^[:space:]]'),
  category text not null check (category in ('fasilitas_umum', 'keamanan', 'kebersihan_sampah')),
  status text not null default 'diajukan' check (status in ('diajukan', 'diproses', 'selesai', 'ditolak')),
  resolution_note text not null default '' check (char_length(resolution_note) <= 2000),
  submitted_payload jsonb not null,
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  check (status not in ('selesai', 'ditolak') or resolution_note ~ '[^[:space:]]')
);
create index complaints_applicant on public.complaints (applicant_id, created_at desc, id);
create index complaints_filter on public.complaints (status, category, created_at desc, id);

create table public.complaint_events (
  id bigint generated always as identity primary key,
  complaint_id uuid not null references public.complaints(id),
  action text not null check (action in ('submitted', 'start', 'complete', 'reject', 'recategorize')),
  previous_status text,
  status text not null,
  previous_category text,
  category text not null,
  note text not null default '' check (char_length(note) <= 2000),
  actor_id uuid not null references public.profiles(id),
  actor_name text not null,
  actor_role text not null,
  occurred_at timestamptz not null default clock_timestamp()
);
create index complaint_events_order on public.complaint_events (complaint_id, occurred_at, id);

create function app_private.complaint_active_account() returns boolean
language sql stable security definer set search_path = '' as $$
  select app_private.has_active_session() and exists (
    select 1 from public.profiles where id = auth.uid() and is_active and archived_at is null
  );
$$;
create function app_private.can_read_complaint(p_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select app_private.complaint_active_account() and exists (
    select 1 from public.complaints where id = p_id
      and (applicant_id = auth.uid() or app_private.is_manager())
  );
$$;
revoke all on function app_private.complaint_active_account(), app_private.can_read_complaint(uuid) from public, anon, authenticated;
grant usage on schema app_private to authenticated;
grant execute on function app_private.complaint_active_account(), app_private.can_read_complaint(uuid) to authenticated;

alter table public.complaints enable row level security;
alter table public.complaint_events enable row level security;
revoke all on public.complaints, public.complaint_events from public, anon, authenticated;
grant select on public.complaints, public.complaint_events to authenticated;
grant all on public.complaints, public.complaint_events to service_role;
create policy "Read own complaints or manage complaints" on public.complaints for select to authenticated
  using ((select app_private.complaint_active_account()) and (applicant_id = (select auth.uid()) or (select app_private.is_manager())));
create policy "Read permitted complaint history" on public.complaint_events for select to authenticated
  using (app_private.can_read_complaint(complaint_id));

create function app_private.guard_complaint_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (to_jsonb(new) - array['category', 'status', 'resolution_note', 'updated_at', 'reference'])
    is distinct from (to_jsonb(old) - array['category', 'status', 'resolution_note', 'updated_at', 'reference']) then
    raise exception 'IMMUTABLE_COMPLAINT' using errcode = '22023';
  end if;
  if old.status in ('selesai', 'ditolak') or not (
    (new.status = old.status and new.category <> old.category and new.resolution_note = old.resolution_note)
    or (old.status = 'diajukan' and new.status in ('diproses', 'ditolak'))
    or (old.status = 'diproses' and new.status in ('selesai', 'ditolak'))
  ) then raise exception 'INVALID_COMPLAINT_TRANSITION' using errcode = '22023'; end if;
  new.updated_at := greatest(clock_timestamp(), old.updated_at + interval '1 microsecond');
  return new;
end;
$$;
revoke all on function app_private.guard_complaint_update() from public, anon, authenticated;
create trigger complaint_update_guard before update on public.complaints
  for each row execute function app_private.guard_complaint_update();

create function public.complaint_detail(p_id uuid, p_scope text default 'mine') returns jsonb
language plpgsql security invoker set search_path = '' as $$
declare result jsonb;
begin
  if not app_private.complaint_active_account() or (p_scope = 'all' and not app_private.is_manager()) then
    raise exception 'ACCESS_DENIED' using errcode = '42501';
  end if;
  if p_scope is null or p_scope not in ('mine', 'all') then
    raise exception 'INVALID_COMPLAINT_INPUT' using errcode = '22023';
  end if;
  select jsonb_build_object('complaint', to_jsonb(c) - 'submitted_payload', 'events',
    coalesce((select jsonb_agg(to_jsonb(e) order by e.occurred_at, e.id)
      from public.complaint_events e where e.complaint_id = c.id), '[]'::jsonb)) into result
    from public.complaints c where c.id = p_id and (p_scope = 'all' or c.applicant_id = auth.uid());
  if result is null then raise exception 'COMPLAINT_NOT_FOUND' using errcode = 'P0002'; end if;
  return result;
end;
$$;

create function public.submit_complaint(p_request_id uuid, p_title text, p_description text, p_category text)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare account public.profiles; existing public.complaints; result public.complaints; payload jsonb;
begin
  if not app_private.complaint_active_account() then raise exception 'ACCESS_DENIED' using errcode = '42501'; end if;
  if p_request_id is null or p_title is null or char_length(btrim(p_title)) not between 1 and 200 or p_title !~ '[^[:space:]]'
    or p_description is null or char_length(btrim(p_description)) not between 1 and 2000 or p_description !~ '[^[:space:]]'
    or p_category is null or p_category not in ('fasilitas_umum', 'keamanan', 'kebersihan_sampah') then
    raise exception 'INVALID_COMPLAINT_INPUT' using errcode = '22023';
  end if;
  payload := jsonb_build_object('title', btrim(p_title), 'description', btrim(p_description), 'category', p_category);
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text, 74120409));
  select * into existing from public.complaints where id = p_request_id;
  if found then
    if existing.applicant_id <> auth.uid() or existing.submitted_payload <> payload then
      raise exception 'COMPLAINT_REQUEST_CONFLICT' using errcode = '22023';
    end if;
    return to_jsonb(existing) - 'submitted_payload';
  end if;
  select * into account from public.profiles where id = auth.uid() for share;
  if not account.is_active or account.archived_at is not null then raise exception 'ACCESS_DENIED' using errcode = '42501'; end if;
  insert into public.complaints(id, applicant_id, identity_snapshot, title, description, category, submitted_payload)
    values (p_request_id, account.id, jsonb_build_object('full_name', account.full_name,
      'house_block', account.house_block, 'house_number', account.house_number),
      btrim(p_title), btrim(p_description), p_category, payload) returning * into result;
  insert into public.complaint_events(complaint_id, action, status, category, actor_id, actor_name, actor_role, occurred_at)
    values (result.id, 'submitted', result.status, result.category, account.id, account.full_name, account.role, result.created_at);
  return to_jsonb(result) - 'submitted_payload';
end;
$$;

create function public.review_complaint(p_id uuid, p_action text, p_category text, p_note text, p_expected_updated_at timestamptz)
returns jsonb language plpgsql security definer set search_path = '' as $$
declare account public.profiles; current_complaint public.complaints; next_status text; next_category text;
begin
  if not app_private.is_manager() then raise exception 'ACCESS_DENIED' using errcode = '42501'; end if;
  select * into account from public.profiles where id = auth.uid() for share;
  if not account.is_active or account.archived_at is not null or account.role not in ('ketua_rt', 'pengurus_rt') then
    raise exception 'ACCESS_DENIED' using errcode = '42501';
  end if;
  select * into current_complaint from public.complaints where id = p_id for update;
  if not found then raise exception 'COMPLAINT_NOT_FOUND' using errcode = 'P0002'; end if;
  if p_expected_updated_at is distinct from current_complaint.updated_at then
    raise exception 'STALE_COMPLAINT' using errcode = '40001';
  end if;
  next_category := coalesce(p_category, current_complaint.category);
  if p_action is null or p_action not in ('start', 'complete', 'reject', 'recategorize')
    or next_category not in ('fasilitas_umum', 'keamanan', 'kebersihan_sampah')
    or p_note is null or char_length(btrim(p_note)) > 2000 then
    raise exception 'INVALID_COMPLAINT_INPUT' using errcode = '22023';
  end if;
  if p_action in ('complete', 'reject') and p_note !~ '[^[:space:]]' then
    raise exception 'COMPLAINT_NOTE_REQUIRED' using errcode = '22023';
  end if;
  if current_complaint.status in ('selesai', 'ditolak')
    or (p_action = 'start' and current_complaint.status <> 'diajukan')
    or (p_action = 'complete' and current_complaint.status <> 'diproses')
    or (p_action = 'recategorize' and (next_category = current_complaint.category or btrim(p_note) <> '')) then
    raise exception 'INVALID_COMPLAINT_TRANSITION' using errcode = '22023';
  end if;
  next_status := case p_action when 'start' then 'diproses' when 'complete' then 'selesai'
    when 'reject' then 'ditolak' else current_complaint.status end;
  update public.complaints set status = next_status, category = next_category,
    resolution_note = case when p_action in ('complete', 'reject') then btrim(p_note) else resolution_note end
    where id = p_id;
  insert into public.complaint_events(complaint_id, action, previous_status, status, previous_category, category,
    note, actor_id, actor_name, actor_role)
    values (p_id, p_action, current_complaint.status, next_status, current_complaint.category, next_category,
      btrim(p_note), account.id, account.full_name, account.role);
  return public.complaint_detail(p_id, 'all');
end;
$$;

create function public.complaints_overview(p_scope text default 'mine', p_search text default '',
  p_category text default 'all', p_status text default 'all', p_from date default null, p_to date default null,
  p_sort text default 'newest', p_page integer default 1)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare result jsonb;
begin
  if not app_private.complaint_active_account() or (p_scope = 'all' and not app_private.is_manager()) then
    raise exception 'ACCESS_DENIED' using errcode = '42501';
  end if;
  if p_scope is null or p_scope not in ('mine', 'all') or p_search is null or char_length(p_search) > 200
    or p_category is null or p_category not in ('all', 'fasilitas_umum', 'keamanan', 'kebersihan_sampah')
    or p_status is null or p_status not in ('all', 'diajukan', 'diproses', 'selesai', 'ditolak')
    or p_sort is null or p_sort not in ('newest', 'oldest') or p_page is null or p_page not between 1 and 1000000
    or (p_from is not null and p_to is not null and p_from > p_to) then
    raise exception 'INVALID_COMPLAINT_INPUT' using errcode = '22023';
  end if;
  with matches as materialized (
    select c.* from public.complaints c
    where (p_scope = 'all' or c.applicant_id = auth.uid())
      and (p_category = 'all' or c.category = p_category) and (p_status = 'all' or c.status = p_status)
      and (p_from is null or c.created_at >= (p_from::timestamp at time zone 'Asia/Jakarta'))
      and (p_to is null or c.created_at < ((p_to + 1)::timestamp at time zone 'Asia/Jakarta'))
      and (strpos(lower(c.title), lower(btrim(p_search))) > 0
        or strpos(lower(c.reference), lower(btrim(p_search))) > 0
        or (p_scope = 'all' and strpos(lower(c.identity_snapshot->>'full_name'), lower(btrim(p_search))) > 0))
  ), numbered as (
    select m.*, row_number() over (order by
      case when p_sort = 'newest' then created_at end desc,
      case when p_sort = 'oldest' then created_at end asc, id) as row_num from matches m
  )
  select jsonb_build_object(
    'items', coalesce((select jsonb_agg(to_jsonb(n) - array['submitted_payload', 'row_num'] order by row_num)
      from numbered n where row_num > (p_page - 1) * 4 and row_num <= p_page * 4), '[]'::jsonb),
    'total', (select count(*) from matches),
    'summary', case when p_scope = 'all' then (select jsonb_build_object(
      'diajukan', count(*) filter (where status = 'diajukan'), 'diproses', count(*) filter (where status = 'diproses'),
      'selesai', count(*) filter (where status = 'selesai'), 'ditolak', count(*) filter (where status = 'ditolak')) from matches)
      else null end
  ) into result;
  return result;
end;
$$;

revoke all on function public.complaint_detail(uuid, text), public.submit_complaint(uuid, text, text, text),
  public.review_complaint(uuid, text, text, text, timestamptz),
  public.complaints_overview(text, text, text, text, date, date, text, integer) from public, anon, authenticated;
grant execute on function public.complaint_detail(uuid, text), public.submit_complaint(uuid, text, text, text),
  public.review_complaint(uuid, text, text, text, timestamptz),
  public.complaints_overview(text, text, text, text, date, date, text, integer) to authenticated;

commit;
