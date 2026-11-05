begin;

-- Optimistic conflicts are HTTP 409, not transaction-retry errors (40xxx).
-- https://docs.postgrest.org/en/stable/references/errors.html
create or replace function public.update_announcement(p_id uuid, p_title text, p_description text, p_starts_at timestamptz,
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
  if p_expected_updated_at is distinct from current_announcement.updated_at then raise exception 'STALE_ANNOUNCEMENT' using errcode = 'PT409'; end if;
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

create or replace function public.archive_announcement(p_id uuid, p_expected_updated_at timestamptz)
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
  if p_expected_updated_at is distinct from current_announcement.updated_at then raise exception 'STALE_ANNOUNCEMENT' using errcode = 'PT409'; end if;
  if current_announcement.archived_at is not null then return to_jsonb(current_announcement) - 'submitted_payload'; end if;
  update public.announcements set archived_at = clock_timestamp(), updated_by = account.id,
    updated_at = greatest(clock_timestamp(), current_announcement.updated_at + interval '1 microsecond')
    where id = p_id returning * into result;
  return to_jsonb(result) - 'submitted_payload';
end;
$$;

notify pgrst, 'reload schema';

commit;
