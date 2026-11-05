begin;

create or replace function public.submit_letter_request(p_request_id uuid, p_letter_type text, p_purpose text,
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
      'family_card_number', account.family_card_number, 'address', account.address,
      'house_number', account.house_number), p_letter_type, app_private.letter_label(p_letter_type),
      btrim(p_purpose), p_contact_phone, btrim(p_additional_notes), p_attachment, payload)
    returning * into result;
  return result;
end;
$$;

commit;
