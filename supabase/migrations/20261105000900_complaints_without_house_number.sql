begin;

create or replace function public.submit_complaint(p_request_id uuid, p_title text, p_description text, p_category text)
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
    values (p_request_id, account.id, jsonb_build_object('full_name', account.full_name),
      btrim(p_title), btrim(p_description), p_category, payload) returning * into result;
  insert into public.complaint_events(complaint_id, action, status, category, actor_id, actor_name, actor_role, occurred_at)
    values (result.id, 'submitted', result.status, result.category, account.id, account.full_name, account.role, result.created_at);
  return to_jsonb(result) - 'submitted_payload';
end;
$$;

commit;
