begin;

create or replace function app_private.generate_monthly_dues(p_now timestamptz default now(), p_resident uuid default null) returns void
language plpgsql security definer set search_path = '' as $$
declare month_start date := date_trunc('month', p_now at time zone 'Asia/Jakarta')::date; rate public.dues_rates;
begin
  -- Settings updates and generation share a lock, preserving the effective rate.
  perform 1 from public.dues_settings where activated_month <= month_start for share;
  if not found then return; end if;
  select * into rate from public.dues_rates where effective_month <= month_start order by effective_month desc limit 1;
  if not found then return; end if;
  insert into public.dues_invoices(resident_id, identity_snapshot, period, amount, due_date)
    select id, jsonb_build_object('full_name', full_name, 'house_number', house_number),
      month_start, rate.amount,
      month_start + (least(rate.due_day, extract(day from (month_start + interval '1 month - 1 day'))::integer) - 1)
    from public.profiles where is_active and archived_at is null and (p_resident is null or id = p_resident)
      and created_at < ((month_start + interval '1 month') at time zone 'Asia/Jakarta')
    on conflict (resident_id, period) do nothing;
end;
$$;

create or replace function public.dues_overview(p_scope text default 'mine', p_period date default null, p_status text default 'all', p_method text default 'all', p_search text default '', p_page integer default 1) returns jsonb
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
      and (p_search='' or position(lower(p_search) in lower(concat_ws(' ',i.identity_snapshot->>'full_name',i.identity_snapshot->>'house_number')))>0)
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

commit;
