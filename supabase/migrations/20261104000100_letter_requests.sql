begin;

-- Invoker RPCs retain RLS and may only execute explicitly granted helpers.
grant usage on schema app_private to authenticated;

create table public.letter_requests (
  id uuid primary key,
  number bigint generated always as identity unique,
  reference text generated always as ('SRT-' || lpad(number::text, greatest(3, length(number::text)), '0')) stored unique,
  applicant_id uuid not null references public.profiles(id),
  identity_snapshot jsonb not null,
  letter_type text not null check (letter_type in ('domisili', 'usaha', 'skck', 'tidak_mampu', 'pindah', 'administrasi_kependudukan', 'keterangan_warga', 'lainnya')),
  letter_type_label text not null,
  purpose text not null check (char_length(btrim(purpose)) between 1 and 2000),
  contact_phone text not null check (contact_phone ~ '^(0|\+?62)8[0-9]{7,12}$'),
  additional_notes text not null default '' check (char_length(additional_notes) <= 2000),
  attachment jsonb,
  submitted_payload jsonb not null,
  status text not null default 'pengajuan' check (status in ('pengajuan', 'diproses', 'selesai')),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp()
);
create index letter_requests_applicant on public.letter_requests (applicant_id, created_at desc, id);
create index letter_requests_status on public.letter_requests (status, created_at desc, id);

create table public.letter_events (
  id bigint generated always as identity primary key,
  request_id uuid not null references public.letter_requests(id),
  previous_status text,
  status text not null,
  actor_id uuid references public.profiles(id),
  actor_name text not null,
  actor_role text not null,
  occurred_at timestamptz not null default clock_timestamp()
);
create index letter_events_request on public.letter_events (request_id, occurred_at, id);

create function app_private.letter_active_account() returns boolean
language sql stable security definer set search_path = '' as $$
  select app_private.has_active_session() and exists (
    select 1 from public.profiles where id = auth.uid() and is_active and archived_at is null
  );
$$;
create function app_private.can_read_letter(p_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select app_private.letter_active_account() and exists (
    select 1 from public.letter_requests
    where id = p_id and (applicant_id = auth.uid() or app_private.is_manager())
  );
$$;
revoke all on function app_private.letter_active_account(), app_private.can_read_letter(uuid) from public, anon, authenticated;
grant execute on function app_private.letter_active_account(), app_private.can_read_letter(uuid) to authenticated;

alter table public.letter_requests enable row level security;
alter table public.letter_events enable row level security;
revoke all on public.letter_requests, public.letter_events from public, anon, authenticated;
grant select on public.letter_requests, public.letter_events to authenticated;
grant all on public.letter_requests, public.letter_events to service_role;
create policy "Read own letters or manage letters" on public.letter_requests for select to authenticated
  using ((select app_private.letter_active_account()) and (applicant_id = (select auth.uid()) or (select app_private.is_manager())));
create policy "Read permitted letter history" on public.letter_events for select to authenticated
  using (app_private.can_read_letter(request_id));

create function app_private.letter_label(p_type text) returns text
language sql immutable set search_path = '' as $$
  select case p_type
    when 'domisili' then 'Surat Pengantar Domisili'
    when 'usaha' then 'Surat Pengantar Usaha'
    when 'skck' then 'Surat Pengantar SKCK'
    when 'tidak_mampu' then 'Surat Pengantar Tidak Mampu'
    when 'pindah' then 'Surat Pengantar Pindah'
    when 'administrasi_kependudukan' then 'Surat Pengantar Administrasi Kependudukan'
    when 'keterangan_warga' then 'Surat Keterangan Warga'
    when 'lainnya' then 'Lainnya' end;
$$;
revoke all on function app_private.letter_label(text) from public, anon, authenticated;

create function app_private.guard_letter_update() returns trigger
language plpgsql set search_path = '' as $$
begin
  if (to_jsonb(new) - array['status', 'updated_at', 'reference']) is distinct from (to_jsonb(old) - array['status', 'updated_at', 'reference']) then
    raise exception 'IMMUTABLE_LETTER' using errcode = '22023';
  end if;
  if not ((old.status = 'pengajuan' and new.status = 'diproses') or (old.status = 'diproses' and new.status = 'selesai')) then
    raise exception 'INVALID_LETTER_TRANSITION' using errcode = '22023';
  end if;
  new.updated_at := clock_timestamp();
  return new;
end;
$$;
create function app_private.record_letter_event() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.letter_events(request_id, previous_status, status, actor_id, actor_name, actor_role, occurred_at)
    select new.id, case when tg_op = 'UPDATE' then old.status else null end, new.status,
      id, full_name, role, new.updated_at from public.profiles where id = auth.uid();
  return new;
end;
$$;
revoke all on function app_private.guard_letter_update(), app_private.record_letter_event() from public, anon, authenticated;
create trigger letter_update_guard before update on public.letter_requests for each row execute function app_private.guard_letter_update();
create trigger letter_event after insert or update on public.letter_requests for each row execute function app_private.record_letter_event();

-- Uploads are immutable. There is deliberately no browser UPDATE/DELETE policy,
-- including for unattached uploads: an ambiguous submission must never lose its file.
insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('letter-attachments', 'letter-attachments', false, 5242880, array['image/jpeg', 'image/png', 'application/pdf']);

create function app_private.can_upload_letter_object(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select app_private.letter_active_account()
    and p_name ~ ('^' || auth.uid()::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{64}\.(jpg|png|pdf)$')
    and exists (select 1 from public.profiles where id = auth.uid() and verification_status = 'terverifikasi')
    and not exists (select 1 from public.letter_requests where id::text = split_part(p_name, '/', 2));
$$;
create function app_private.can_read_letter_object(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select app_private.letter_active_account() and (
    exists (select 1 from public.letter_requests where attachment->>'path' = p_name
      and (applicant_id = auth.uid() or app_private.is_manager()))
    -- A submitting owner may compare an existing upload when recovering a retry.
    or (split_part(p_name, '/', 1) = auth.uid()::text and not exists (
      select 1 from public.letter_requests where id::text = split_part(p_name, '/', 2)
    ))
  );
$$;
revoke all on function app_private.can_upload_letter_object(text), app_private.can_read_letter_object(text) from public, anon, authenticated;
grant execute on function app_private.can_upload_letter_object(text), app_private.can_read_letter_object(text) to authenticated;
create policy "Upload own pending letter attachment" on storage.objects for insert to authenticated
  with check (bucket_id = 'letter-attachments' and app_private.can_upload_letter_object(name));
create policy "Download permitted letter attachment" on storage.objects for select to authenticated
  using (bucket_id = 'letter-attachments' and app_private.can_read_letter_object(name));

create function public.submit_letter_request(p_request_id uuid, p_letter_type text, p_purpose text,
  p_contact_phone text, p_additional_notes text default '', p_attachment jsonb default null)
returns public.letter_requests language plpgsql security definer set search_path = '' as $$
declare
  account public.profiles; existing public.letter_requests; result public.letter_requests;
  payload jsonb; object_metadata jsonb;
begin
  if not app_private.letter_active_account() then raise exception 'ACCESS_DENIED' using errcode = '42501'; end if;
  if p_request_id is null or app_private.letter_label(p_letter_type) is null
    or p_purpose is null or char_length(btrim(p_purpose)) not between 1 and 2000
    or p_contact_phone is null or p_contact_phone !~ '^(0|\+?62)8[0-9]{7,12}$'
    or p_additional_notes is null or char_length(p_additional_notes) > 2000 then
    raise exception 'INVALID_LETTER_INPUT' using errcode = '22023';
  end if;
  payload := jsonb_build_object('letter_type', p_letter_type, 'purpose', btrim(p_purpose),
    'contact_phone', p_contact_phone, 'additional_notes', btrim(p_additional_notes), 'attachment', p_attachment);
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text, 74120408));
  select * into existing from public.letter_requests where id = p_request_id;
  if found then
    if existing.applicant_id <> auth.uid() or existing.submitted_payload <> payload then
      raise exception 'LETTER_REQUEST_CONFLICT' using errcode = '22023';
    end if;
    return existing;
  end if;
  select * into account from public.profiles where id = auth.uid() for share;
  if not account.is_active or account.archived_at is not null then raise exception 'ACCESS_DENIED' using errcode = '42501'; end if;
  perform app_private.require_complete_profile(account);
  if account.verification_status <> 'terverifikasi' then raise exception 'PROFILE_NOT_VERIFIED' using errcode = '22023'; end if;
  if p_attachment is not null then
    if jsonb_typeof(p_attachment) <> 'object'
      or not (p_attachment ?& array['path', 'name', 'size', 'type'])
      or jsonb_typeof(p_attachment->'path') is distinct from 'string'
      or jsonb_typeof(p_attachment->'name') is distinct from 'string'
      or jsonb_typeof(p_attachment->'size') is distinct from 'number'
      or jsonb_typeof(p_attachment->'type') is distinct from 'string'
      or char_length(coalesce(p_attachment->>'name', '')) not between 1 and 255
      or (p_attachment->>'path') !~ ('^' || auth.uid()::text || '/' || p_request_id::text || '/[0-9a-f]{64}\.(jpg|png|pdf)$') then
      raise exception 'INVALID_ATTACHMENT' using errcode = '22023';
    end if;
    select metadata into object_metadata from storage.objects
      where bucket_id = 'letter-attachments' and name = p_attachment->>'path' for share;
    if not found or coalesce(object_metadata->>'size', '') !~ '^[0-9]{1,8}$' then
      raise exception 'INVALID_ATTACHMENT' using errcode = '22023';
    end if;
    if (object_metadata->>'size')::bigint not between 1 and 5242880
      or object_metadata->>'size' is distinct from p_attachment->>'size'
      or object_metadata->>'mimetype' is distinct from p_attachment->>'type'
      or coalesce(p_attachment->>'type', '') not in ('image/jpeg', 'image/png', 'application/pdf')
      or right(p_attachment->>'path', 4) <> (case p_attachment->>'type' when 'image/jpeg' then '.jpg' when 'image/png' then '.png' else '.pdf' end) then
      raise exception 'INVALID_ATTACHMENT' using errcode = '22023';
    end if;
  end if;
  insert into public.letter_requests(id, applicant_id, identity_snapshot, letter_type, letter_type_label,
    purpose, contact_phone, additional_notes, attachment, submitted_payload)
    values (p_request_id, account.id, jsonb_build_object('full_name', account.full_name, 'nik', account.nik,
      'family_card_number', account.family_card_number, 'address', account.address, 'house_block', account.house_block,
      'house_number', account.house_number), p_letter_type, app_private.letter_label(p_letter_type),
      btrim(p_purpose), p_contact_phone, btrim(p_additional_notes), p_attachment, payload)
    returning * into result;
  return result;
end;
$$;

create function public.advance_letter_request(p_id uuid, p_status text, p_expected_updated_at timestamptz)
returns public.letter_requests language plpgsql security definer set search_path = '' as $$
declare current_request public.letter_requests;
begin
  if not app_private.is_manager() then raise exception 'ACCESS_DENIED' using errcode = '42501'; end if;
  select * into current_request from public.letter_requests where id = p_id for update;
  if not found then raise exception 'LETTER_NOT_FOUND' using errcode = 'P0002'; end if;
  if p_expected_updated_at is distinct from current_request.updated_at then raise exception 'STALE_LETTER' using errcode = '40001'; end if;
  if p_status is null or not ((current_request.status = 'pengajuan' and p_status = 'diproses') or (current_request.status = 'diproses' and p_status = 'selesai')) then
    raise exception 'INVALID_LETTER_TRANSITION' using errcode = '22023';
  end if;
  update public.letter_requests set status = p_status where id = p_id returning * into current_request;
  return current_request;
end;
$$;

create function public.list_letter_requests(p_scope text default 'mine', p_search text default '', p_type text default 'all',
  p_status text default 'all', p_sort text default 'newest', p_page integer default 1)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare result jsonb;
begin
  if not app_private.letter_active_account() or (p_scope = 'all' and not app_private.is_manager()) then
    raise exception 'ACCESS_DENIED' using errcode = '42501';
  end if;
  if p_scope is null or p_scope not in ('mine', 'all') or p_sort is null or p_sort not in ('newest', 'oldest')
    or p_status is null or p_status not in ('all', 'pengajuan', 'diproses', 'selesai')
    or p_page is null or p_page not between 1 and 1000000
    or p_search is null or char_length(p_search) > 200 then raise exception 'INVALID_LETTER_INPUT' using errcode = '22023'; end if;
  with matches as materialized (
    select * from public.letter_requests
    where (p_scope = 'all' or applicant_id = auth.uid())
      and (p_status = 'all' or status = p_status) and (p_type = 'all' or letter_type = p_type)
      and (strpos(lower(identity_snapshot->>'full_name'), lower(btrim(p_search))) > 0
        or strpos(lower(letter_type_label), lower(btrim(p_search))) > 0
        or strpos(lower(reference), lower(btrim(p_search))) > 0)
  ), page_rows as (
    select * from matches order by case when p_sort = 'newest' then created_at end desc,
      case when p_sort = 'oldest' then created_at end asc, id
    limit 4 offset (p_page - 1) * 4
  ) select jsonb_build_object('items', coalesce((select jsonb_agg(to_jsonb(p) - 'submitted_payload') from page_rows p), '[]'::jsonb),
    'total', (select count(*) from matches)) into result;
  return result;
end;
$$;

create function public.letter_summary() returns jsonb
language plpgsql security invoker set search_path = '' as $$
begin
  if not app_private.is_manager() then raise exception 'ACCESS_DENIED' using errcode = '42501'; end if;
  return (select jsonb_build_object('total', count(*), 'pengajuan', count(*) filter (where status = 'pengajuan'),
    'diproses', count(*) filter (where status = 'diproses'), 'selesai', count(*) filter (where status = 'selesai')) from public.letter_requests);
end;
$$;
revoke all on function public.submit_letter_request(uuid, text, text, text, text, jsonb),
  public.advance_letter_request(uuid, text, timestamptz), public.list_letter_requests(text, text, text, text, text, integer), public.letter_summary() from public, anon, authenticated;
grant execute on function public.submit_letter_request(uuid, text, text, text, text, jsonb),
  public.advance_letter_request(uuid, text, timestamptz), public.list_letter_requests(text, text, text, text, text, integer), public.letter_summary() to authenticated;

commit;
