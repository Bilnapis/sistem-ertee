begin;

create table public.dues_settings (
  id boolean primary key default true check (id),
  activated_month date not null default date_trunc('month', now() at time zone 'Asia/Jakarta')::date,
  bank_name text not null default '',
  bank_account text not null default '',
  bank_holder text not null default '',
  updated_at timestamptz not null default clock_timestamp(),
  check (char_length(bank_name) <= 100 and char_length(bank_account) <= 50 and char_length(bank_holder) <= 150),
  check ((bank_name = '' and bank_account = '' and bank_holder = '') or
    (btrim(bank_name) <> '' and bank_account ~ '^[0-9]{5,50}$' and btrim(bank_holder) <> ''))
);
insert into public.dues_settings default values;
create table public.dues_rates (
  effective_month date primary key check (extract(day from effective_month) = 1),
  amount numeric(12,0) not null check (amount > 0),
  due_day integer not null check (due_day between 1 and 31),
  updated_by uuid references public.profiles(id)
);
insert into public.dues_rates select activated_month, 50000, 10, null from public.dues_settings;
create table public.dues_invoices (
  id uuid primary key default gen_random_uuid(),
  resident_id uuid not null references public.profiles(id),
  identity_snapshot jsonb not null,
  period date not null check (extract(day from period) = 1),
  amount numeric(12,0) not null check (amount > 0),
  due_date date not null,
  status text not null default 'belum_bayar' check (status in ('belum_bayar','menunggu_verifikasi','lunas')),
  method text check (method in ('tunai','transfer')),
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  unique (resident_id, period)
);
create index dues_invoice_period on public.dues_invoices(period desc, status, id);
create table public.dues_payments (
  id uuid primary key,
  invoice_id uuid not null references public.dues_invoices(id),
  method text not null check (method in ('tunai','transfer')),
  payment_date date not null,
  notes text not null default '' check (char_length(notes) <= 2000),
  attachment jsonb,
  bank_snapshot jsonb,
  submitted_payload jsonb not null,
  status text not null default 'diajukan' check (status in ('diajukan','disetujui','ditolak','dibatalkan')),
  submitted_by uuid not null references public.profiles(id),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  review_note text not null default '',
  cancelled_by uuid references public.profiles(id),
  cancelled_at timestamptz,
  cancellation_note text not null default '',
  created_at timestamptz not null default clock_timestamp(),
  updated_at timestamptz not null default clock_timestamp(),
  check ((method = 'tunai' and attachment is null and bank_snapshot is null) or
    (method = 'transfer' and attachment is not null and bank_snapshot is not null))
);
create unique index dues_one_open_payment on public.dues_payments(invoice_id) where status in ('diajukan','disetujui');
create index dues_payments_invoice on public.dues_payments(invoice_id, created_at, id);
create table public.dues_cash_entries (
  id uuid primary key default gen_random_uuid(),
  payment_id uuid not null unique references public.dues_payments(id),
  invoice_id uuid not null references public.dues_invoices(id),
  amount numeric(12,0) not null check (amount > 0),
  transaction_date date not null,
  status text not null default 'tercatat' check (status in ('tercatat','dibatalkan')),
  created_at timestamptz not null default clock_timestamp(),
  cancelled_at timestamptz
);
create unique index dues_one_active_income on public.dues_cash_entries(invoice_id) where status = 'tercatat';
create table public.dues_events (
  id bigint generated always as identity primary key,
  invoice_id uuid references public.dues_invoices(id),
  payment_id uuid references public.dues_payments(id),
  action text not null,
  actor_id uuid not null references public.profiles(id),
  actor_name text not null,
  actor_role text not null,
  note text not null default '',
  details jsonb not null default '{}',
  occurred_at timestamptz not null default clock_timestamp()
);
create index dues_events_invoice on public.dues_events(invoice_id, occurred_at, id);

create function app_private.dues_active_account() returns boolean
language sql stable security definer set search_path = '' as $$
  select app_private.has_active_session() and exists (
    select 1 from public.profiles where id = auth.uid() and is_active and archived_at is null
  );
$$;
create function app_private.can_read_dues(p_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select app_private.dues_active_account() and exists (
    select 1 from public.dues_invoices where id = p_id and (resident_id = auth.uid() or app_private.is_manager())
  );
$$;
create function app_private.generate_monthly_dues(p_now timestamptz default now(), p_resident uuid default null) returns void
language plpgsql security definer set search_path = '' as $$
declare month_start date := date_trunc('month', p_now at time zone 'Asia/Jakarta')::date; rate public.dues_rates;
begin
  -- Settings updates and generation share a lock, preserving the effective rate.
  perform 1 from public.dues_settings where activated_month <= month_start for share;
  if not found then return; end if;
  select * into rate from public.dues_rates where effective_month <= month_start order by effective_month desc limit 1;
  if not found then return; end if;
  insert into public.dues_invoices(resident_id, identity_snapshot, period, amount, due_date)
    select id, jsonb_build_object('full_name', full_name, 'house_block', house_block, 'house_number', house_number),
      month_start, rate.amount,
      month_start + (least(rate.due_day, extract(day from (month_start + interval '1 month - 1 day'))::integer) - 1)
    from public.profiles where is_active and archived_at is null and (p_resident is null or id = p_resident)
      and created_at < ((month_start + interval '1 month') at time zone 'Asia/Jakarta')
    on conflict (resident_id, period) do nothing;
end;
$$;
create function app_private.dues_profile_activated() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if new.is_active and new.archived_at is null then perform app_private.generate_monthly_dues(now(), new.id); end if;
  return new;
end;
$$;
create trigger dues_profile_activation after insert or update of is_active, archived_at on public.profiles
for each row execute function app_private.dues_profile_activated();
select app_private.generate_monthly_dues();

do $$ declare t text; begin
  foreach t in array array['dues_settings','dues_rates','dues_invoices','dues_payments','dues_cash_entries','dues_events'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from public, anon, authenticated', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('grant all on public.%I to service_role', t);
  end loop;
end $$;
create policy "Active accounts read dues configuration" on public.dues_settings for select to authenticated using ((select app_private.dues_active_account()));
create policy "Active accounts read dues rates" on public.dues_rates for select to authenticated using ((select app_private.dues_active_account()));
create policy "Read own or managed dues" on public.dues_invoices for select to authenticated using (app_private.can_read_dues(id));
create policy "Read permitted dues payments" on public.dues_payments for select to authenticated using (app_private.can_read_dues(invoice_id));
create policy "Managers read dues cash entries" on public.dues_cash_entries for select to authenticated using ((select app_private.is_manager()));
create policy "Read permitted dues events" on public.dues_events for select to authenticated using (
  (select app_private.is_manager()) or app_private.can_read_dues(invoice_id)
);

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values ('dues-proofs','dues-proofs',false,5242880,array['image/jpeg','image/png','application/pdf']);
create function app_private.can_upload_dues_proof(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select app_private.dues_active_account()
    and p_name ~ ('^' || auth.uid()::text || '/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/[0-9a-f]{64}\.(jpg|png|pdf)$')
    and not exists (select 1 from public.dues_payments where id::text = split_part(p_name,'/',2));
$$;
create function app_private.can_read_dues_proof(p_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select app_private.dues_active_account() and (
    exists (select 1 from public.dues_payments p where p.attachment->>'path' = p_name and app_private.can_read_dues(p.invoice_id))
    or (split_part(p_name,'/',1) = auth.uid()::text and not exists (
      select 1 from public.dues_payments where id::text = split_part(p_name,'/',2)
    ))
  );
$$;
create policy "Upload immutable own dues proof" on storage.objects for insert to authenticated
  with check (bucket_id = 'dues-proofs' and app_private.can_upload_dues_proof(name));
create policy "Download permitted dues proof" on storage.objects for select to authenticated
  using (bucket_id = 'dues-proofs' and app_private.can_read_dues_proof(name));

create function app_private.record_dues_event(p_invoice uuid, p_payment uuid, p_action text, p_note text default '', p_details jsonb default '{}') returns void
language sql security definer set search_path = '' as $$
  insert into public.dues_events(invoice_id,payment_id,action,actor_id,actor_name,actor_role,note,details)
  select p_invoice,p_payment,p_action,id,full_name,role,p_note,p_details from public.profiles where id = auth.uid();
$$;

create function public.dues_configuration() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare current_month date := date_trunc('month',now() at time zone 'Asia/Jakarta')::date; result jsonb;
begin
  if not app_private.dues_active_account() then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
  select to_jsonb(s) || jsonb_build_object(
    'current_rate',(select to_jsonb(r) from public.dues_rates r where effective_month <= current_month order by effective_month desc limit 1),
    'next_rate',(select to_jsonb(r) from public.dues_rates r where effective_month <= (current_month + interval '1 month')::date order by effective_month desc limit 1),
    'next_month',(current_month + interval '1 month')::date
  ) into result from public.dues_settings s;
  return result;
end;
$$;
create function public.update_dues_configuration(p_amount numeric, p_due_day integer, p_bank_name text, p_bank_account text, p_bank_holder text, p_expected_updated_at timestamptz) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare config public.dues_settings; next_month date := (date_trunc('month',now() at time zone 'Asia/Jakarta') + interval '1 month')::date;
begin
  if not app_private.is_manager() then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
  if p_amount is null or p_amount <= 0 or p_amount >= 1000000000000 or p_amount <> trunc(p_amount)
    or p_due_day is null or p_due_day not between 1 and 31 or p_bank_name is null or p_bank_account is null or p_bank_holder is null then
    raise exception 'INVALID_DUES_SETTINGS' using errcode='22023';
  end if;
  select * into config from public.dues_settings for update;
  if config.updated_at is distinct from p_expected_updated_at then raise exception 'STALE_DUES' using errcode='40001'; end if;
  update public.dues_settings set bank_name=btrim(p_bank_name),bank_account=btrim(p_bank_account),bank_holder=btrim(p_bank_holder),updated_at=clock_timestamp();
  insert into public.dues_rates(effective_month,amount,due_day,updated_by) values (next_month,p_amount,p_due_day,auth.uid())
    on conflict (effective_month) do update set amount=excluded.amount,due_day=excluded.due_day,updated_by=excluded.updated_by;
  perform app_private.record_dues_event(null,null,'pengaturan_diubah','',jsonb_build_object('effective_month',next_month,'amount',p_amount,'due_day',p_due_day));
  return public.dues_configuration();
end;
$$;

create function public.dues_overview(p_scope text default 'mine', p_period date default null, p_status text default 'all', p_method text default 'all', p_search text default '', p_page integer default 1) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare month_start date := date_trunc('month',now() at time zone 'Asia/Jakarta')::date; selected_month date;
  result jsonb; rows_json jsonb; row_count bigint; summary jsonb;
begin
  if not app_private.dues_active_account() or p_scope is null or p_scope not in ('mine','all') or (p_scope='all' and not app_private.is_manager()) then
    raise exception 'ACCESS_DENIED' using errcode='42501';
  end if;
  if p_page is null or p_page not between 1 and 1000000 or p_status is null or p_status not in ('all','belum_bayar','menunggu_verifikasi','lunas')
    or p_method is null or p_method not in ('all','tunai','transfer') or p_search is null or char_length(p_search)>200
    or (p_period is not null and extract(day from p_period)<>1) then raise exception 'INVALID_DUES_FILTER' using errcode='22023'; end if;
  if p_scope='all' then perform app_private.generate_monthly_dues(); else perform app_private.generate_monthly_dues(now(),auth.uid()); end if;
  selected_month := case when p_scope='all' then coalesce(p_period,month_start) else p_period end;
  with filtered as (
    select i.*, (select p.payment_date from public.dues_payments p where p.invoice_id=i.id and p.status='disetujui') as payment_date
    from public.dues_invoices i where (p_scope='all' or i.resident_id=auth.uid())
      and (selected_month is null or i.period=selected_month)
      and (p_status='all' or i.status=p_status) and (p_method='all' or i.method=p_method)
      and (p_search='' or position(lower(p_search) in lower(concat_ws(' ',i.identity_snapshot->>'full_name',i.identity_snapshot->>'house_block',i.identity_snapshot->>'house_number')))>0)
  ) select (select count(*) from filtered), coalesce((select jsonb_agg(to_jsonb(x) order by x.period desc,x.created_at desc,x.id) from (
    select * from filtered order by period desc,created_at desc,id limit 10 offset (p_page-1)*10
  ) x),'[]') into row_count,rows_json;
  select jsonb_build_object('total',count(*),'belum_bayar',count(*) filter(where status='belum_bayar'),
    'menunggu_verifikasi',count(*) filter(where status='menunggu_verifikasi'),'lunas',count(*) filter(where status='lunas'))
    into summary from public.dues_invoices where (p_scope='all' or resident_id=auth.uid()) and period=coalesce(selected_month,month_start);
  select summary || jsonb_build_object('income',coalesce(sum(c.amount),0)) into summary
    from public.dues_cash_entries c join public.dues_invoices i on i.id=c.invoice_id
    where c.status='tercatat' and (p_scope='all' or i.resident_id=auth.uid())
      and c.transaction_date >= coalesce(selected_month,month_start) and c.transaction_date < (coalesce(selected_month,month_start)+interval '1 month');
  select to_jsonb(i) into result from public.dues_invoices i where resident_id=auth.uid() and period=month_start;
  return jsonb_build_object('current',result,'items',rows_json,'total',row_count,'summary',summary,'period',month_start,'configuration',public.dues_configuration());
end;
$$;
create function public.dues_detail(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare result jsonb;
begin
  if not app_private.can_read_dues(p_id) then raise exception 'DUES_NOT_FOUND' using errcode='P0002'; end if;
  select jsonb_build_object('invoice',to_jsonb(i),
    'payments',coalesce((select jsonb_agg(to_jsonb(p) - 'submitted_payload' order by p.created_at desc,p.id) from public.dues_payments p where invoice_id=p_id),'[]'),
    'events',coalesce((select jsonb_agg(to_jsonb(e) order by e.occurred_at,e.id) from public.dues_events e where invoice_id=p_id),'[]'))
    into result from public.dues_invoices i where id=p_id;
  return result;
end;
$$;

create function public.submit_dues_payment(p_request_id uuid,p_invoice_id uuid,p_method text,p_payment_date date,p_notes text default '',p_attachment jsonb default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare invoice public.dues_invoices; existing public.dues_payments; config public.dues_settings;
  payload jsonb; metadata jsonb; path text; extension text; bank jsonb;
begin
  if not app_private.dues_active_account() then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
  if p_request_id is null or p_method is null or p_method not in ('tunai','transfer') or p_payment_date is null
    or p_payment_date > (now() at time zone 'Asia/Jakarta')::date or p_payment_date < date '2000-01-01'
    or p_notes is null or char_length(p_notes)>2000 then raise exception 'INVALID_DUES_PAYMENT' using errcode='22023'; end if;
  payload := jsonb_build_object('invoice_id',p_invoice_id,'method',p_method,'payment_date',p_payment_date,'notes',btrim(p_notes),'attachment',p_attachment);
  perform pg_advisory_xact_lock(hashtextextended(p_request_id::text,74120409));
  select * into existing from public.dues_payments where id=p_request_id;
  if found then
    if existing.submitted_by<>auth.uid() or existing.submitted_payload is distinct from payload then raise exception 'DUES_REQUEST_CONFLICT' using errcode='22023'; end if;
    return public.dues_detail(existing.invoice_id);
  end if;
  select * into invoice from public.dues_invoices where id=p_invoice_id and resident_id=auth.uid() for update;
  if not found then raise exception 'DUES_NOT_FOUND' using errcode='P0002'; end if;
  if invoice.status<>'belum_bayar' then raise exception 'DUES_PAYMENT_EXISTS' using errcode='40001'; end if;
  if p_method='tunai' then
    if p_attachment is not null then raise exception 'CASH_PROOF_NOT_ALLOWED' using errcode='22023'; end if;
  else
    select * into config from public.dues_settings for share;
    if config.bank_name='' then raise exception 'BANK_NOT_CONFIGURED' using errcode='22023'; end if;
    if p_attachment is null or jsonb_typeof(p_attachment)<>'object' then raise exception 'INVALID_DUES_PROOF' using errcode='22023'; end if;
    path := p_attachment->>'path';
    extension := case p_attachment->>'type' when 'image/jpeg' then 'jpg' when 'image/png' then 'png' when 'application/pdf' then 'pdf' end;
    if extension is null or path is null or path !~ ('^'||auth.uid()::text||'/'||p_request_id::text||'/[0-9a-f]{64}\.'||extension||'$')
      or coalesce(char_length(p_attachment->>'name'),0) not between 1 and 255
      or coalesce(p_attachment->>'name','') !~* '\.(jpe?g|png|pdf)$'
      or coalesce(p_attachment->>'size','') !~ '^[0-9]{1,7}$' then raise exception 'INVALID_DUES_PROOF' using errcode='22023'; end if;
    select o.metadata into metadata from storage.objects o where bucket_id='dues-proofs' and name=path;
    if metadata is null or coalesce(metadata->>'size','') !~ '^[0-9]{1,7}$'
      or (metadata->>'size')::integer not between 1 and 5242880
      or (metadata->>'size')::integer <> (p_attachment->>'size')::integer
      or metadata->>'mimetype' is distinct from p_attachment->>'type' then raise exception 'INVALID_DUES_PROOF' using errcode='22023'; end if;
    bank := jsonb_build_object('bank_name',config.bank_name,'bank_account',config.bank_account,'bank_holder',config.bank_holder);
  end if;
  insert into public.dues_payments(id,invoice_id,method,payment_date,notes,attachment,bank_snapshot,submitted_payload,submitted_by)
    values(p_request_id,p_invoice_id,p_method,p_payment_date,btrim(p_notes),p_attachment,bank,payload,auth.uid());
  update public.dues_invoices set status='menunggu_verifikasi',method=p_method,updated_at=clock_timestamp() where id=p_invoice_id;
  perform app_private.record_dues_event(p_invoice_id,p_request_id,'diajukan',btrim(p_notes));
  return public.dues_detail(p_invoice_id);
end;
$$;
create function public.review_dues_payment(p_payment_id uuid,p_action text,p_note text,p_expected_updated_at timestamptz) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare payment public.dues_payments; invoice public.dues_invoices; invoice_id uuid;
begin
  if not app_private.is_manager() then raise exception 'ACCESS_DENIED' using errcode='42501'; end if;
  if p_action is null or p_action not in ('disetujui','ditolak','dibatalkan') or p_note is null or char_length(p_note)>2000
    or (p_action in ('ditolak','dibatalkan') and btrim(p_note)='') then raise exception 'DUES_NOTE_REQUIRED' using errcode='22023'; end if;
  select p.invoice_id into invoice_id from public.dues_payments p where id=p_payment_id;
  select * into invoice from public.dues_invoices where id=invoice_id for update;
  select * into payment from public.dues_payments where id=p_payment_id for update;
  if not found then raise exception 'DUES_NOT_FOUND' using errcode='P0002'; end if;
  if payment.status=p_action then return public.dues_detail(payment.invoice_id); end if;
  if payment.updated_at is distinct from p_expected_updated_at then raise exception 'STALE_DUES' using errcode='40001'; end if;
  if (p_action in ('disetujui','ditolak') and payment.status<>'diajukan') or (p_action='dibatalkan' and payment.status<>'disetujui') then
    raise exception 'INVALID_DUES_TRANSITION' using errcode='22023';
  end if;
  if p_action='dibatalkan' then
    update public.dues_payments set status=p_action,cancelled_by=auth.uid(),cancelled_at=clock_timestamp(),cancellation_note=btrim(p_note),updated_at=clock_timestamp() where id=p_payment_id;
    update public.dues_cash_entries set status='dibatalkan',cancelled_at=clock_timestamp() where payment_id=p_payment_id;
  else
    update public.dues_payments set status=p_action,reviewed_by=auth.uid(),reviewed_at=clock_timestamp(),review_note=btrim(p_note),updated_at=clock_timestamp() where id=p_payment_id;
    if p_action='disetujui' then
      insert into public.dues_cash_entries(payment_id,invoice_id,amount,transaction_date) values(payment.id,invoice.id,invoice.amount,payment.payment_date);
    end if;
  end if;
  update public.dues_invoices set status=case when p_action='disetujui' then 'lunas' else 'belum_bayar' end,updated_at=clock_timestamp() where id=payment.invoice_id;
  perform app_private.record_dues_event(payment.invoice_id,payment.id,p_action,btrim(p_note));
  return public.dues_detail(payment.invoice_id);
end;
$$;

revoke all on function app_private.dues_active_account(),app_private.can_read_dues(uuid),
  app_private.generate_monthly_dues(timestamptz,uuid),app_private.dues_profile_activated(),
  app_private.can_upload_dues_proof(text),app_private.can_read_dues_proof(text),
  app_private.record_dues_event(uuid,uuid,text,text,jsonb) from public,anon,authenticated;
grant execute on function app_private.dues_active_account(),app_private.can_read_dues(uuid),
  app_private.can_upload_dues_proof(text),app_private.can_read_dues_proof(text) to authenticated;
revoke all on function public.dues_configuration(),public.update_dues_configuration(numeric,integer,text,text,text,timestamptz),
  public.dues_overview(text,date,text,text,text,integer),public.dues_detail(uuid),
  public.submit_dues_payment(uuid,uuid,text,date,text,jsonb),public.review_dues_payment(uuid,text,text,timestamptz) from public,anon,authenticated;
grant execute on function public.dues_configuration(),public.update_dues_configuration(numeric,integer,text,text,text,timestamptz),
  public.dues_overview(text,date,text,text,text,integer),public.dues_detail(uuid),
  public.submit_dues_payment(uuid,uuid,text,date,text,jsonb),public.review_dues_payment(uuid,text,text,timestamptz) to authenticated;

commit;
