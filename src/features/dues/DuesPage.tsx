import { useEffect } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  Search,
  Settings2,
  Wallet,
} from 'lucide-react'
import { Outlet, useLocation, useSearchParams } from 'react-router'
import { ButtonLink, Button } from '../../components/Button'
import { PageIntro } from '../../components/PageIntro'
import { Select } from '../../components/Select'
import { SummaryCardView } from '../../components/SummaryCardView'
import {
  TableActionLink,
  TableBadge,
  TableCellText,
  TablePagination,
} from '../../components/TablePagination'
import type { TablePaginationColumn } from '../../components/TablePagination'
import { TextInput } from '../../components/TextInput'
import { cn } from '../../lib/cn'
import { useAuth } from '../auth/AuthProvider'
import { isManager } from '../residents/data'
import {
  dateOnly,
  duesError,
  duesStatuses,
  isDuesStatus,
  isPaymentMethod,
  monthLabel,
  paymentMethods,
  rupiah,
  useDues,
} from './data'
import type { DuesFilters, DuesInvoice } from './types'
import { DuesStatusBadge } from './DuesStatusBadge'

function CurrentBill({ invoice }: { invoice: DuesInvoice }) {
  const location = useLocation()
  const destination = (suffix = '') => ({
    pathname: `/warga/iuran-warga/${invoice.id}${suffix}`,
    search: location.search,
  })
  return (
    <section
      className="flex flex-col gap-5 rounded-card border border-border bg-surface p-6 @max-[580px]/page:p-5 [&_h2]:text-2xl [&_h2]:leading-tight [&_h2]:font-bold"
      aria-labelledby="dues-bill-title"
    >
      <div className="flex flex-wrap items-center justify-between gap-4">
        <h2 id="dues-bill-title">Tagihan Iuran</h2>
        <DuesStatusBadge status={invoice.status} />
      </div>
      <dl className="m-0 grid grid-cols-5 gap-6 @max-[1000px]/page:grid-cols-3 @max-[580px]/page:grid-cols-2 @max-[580px]/page:gap-4 [&_dd]:m-0 [&_dd]:mt-1 [&_dd]:text-lg [&_dd]:leading-normal [&_dd]:font-bold [&_dd]:wrap-anywhere @max-[580px]/page:[&_dd]:text-base [&_dt]:text-sm [&_dt]:leading-normal [&_dt]:font-semibold [&_dt]:text-muted">
        <div>
          <dt>Nama Warga</dt>
          <dd>{invoice.identity_snapshot.full_name}</dd>
        </div>
        <div>
          <dt>Nomor Rumah</dt>
          <dd>{invoice.identity_snapshot.house_number ?? 'Belum diisi'}</dd>
        </div>
        <div>
          <dt>Periode</dt>
          <dd>{monthLabel(invoice.period)}</dd>
        </div>
        <div>
          <dt>Nominal</dt>
          <dd>{rupiah(invoice.amount)}</dd>
        </div>
        <div>
          <dt>Jatuh Tempo</dt>
          <dd>{dateOnly(invoice.due_date)}</dd>
        </div>
      </dl>
      {invoice.status === 'lunas' ? (
        <p className="flex items-center gap-3 rounded-summary bg-emerald-50 p-4 text-sm leading-relaxed wrap-anywhere text-success forced-colors:border forced-colors:border-[CanvasText] [&>svg]:shrink-0">
          <CheckCircle2 size={20} aria-hidden="true" />
          Pembayaran {monthLabel(invoice.period)} telah diverifikasi pengurus.
        </p>
      ) : invoice.status === 'menunggu_verifikasi' ? (
        <p className="block rounded-summary bg-amber-50 p-4 text-sm leading-relaxed wrap-anywhere text-warning forced-colors:border forced-colors:border-[CanvasText]">
          Konfirmasi pembayaran sudah dikirim. Pengurus akan memeriksa
          pembayaran Anda.
        </p>
      ) : null}
      <div className="flex flex-wrap items-center gap-4">
        {invoice.status === 'belum_bayar' ? (
          <ButtonLink
            to={destination('/bayar')}
            variant="solid"
            leadingIcon={<Wallet size={19} aria-hidden="true" />}
          >
            Bayar Iuran
          </ButtonLink>
        ) : null}
        <ButtonLink
          to={destination()}
          variant="ghost"
          trailingIcon={<ArrowRight size={16} aria-hidden="true" />}
          size="text"
          align="start"
        >
          Lihat detail
        </ButtonLink>
      </div>
    </section>
  )
}

export default function DuesPage({ manage = false }: { manage?: boolean }) {
  const [params, setParams] = useSearchParams(),
    location = useLocation()
  const { profile } = useAuth()
  const status = params.get('status') ?? '',
    method = params.get('metode') ?? '',
    period = params.get('bulan') ?? ''
  const filters: DuesFilters = {
    status: isDuesStatus(status) ? status : 'all',
    method: isPaymentMethod(method) ? method : 'all',
    period:
      /^\d{4}-(0[1-9]|1[0-2])$/.test(period) && period.slice(0, 4) >= '2000'
        ? period
        : '',
    search: (params.get('cari') ?? '').slice(0, 200),
    page: Math.min(
      1000000,
      Math.max(1, Math.floor(Number(params.get('halaman')) || 1)),
    ),
  }
  const query = useDues(manage, filters),
    data = query.data
  const base = `${manage ? '/admin' : '/warga'}/iuran-warga`,
    pages = Math.max(1, Math.ceil((data?.total ?? 0) / 10))
  function change(key: string, value: string) {
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        if (!value || value === 'all' || (key === 'halaman' && value === '1'))
          next.delete(key)
        else next.set(key, value)
        if (key !== 'halaman') next.delete('halaman')
        return next
      },
      { replace: true },
    )
  }
  useEffect(() => {
    if (query.isSuccess && filters.page > pages)
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous)
          next.delete('halaman')
          return next
        },
        { replace: true },
      )
  }, [query.isSuccess, filters.page, pages, setParams])
  const columns: TablePaginationColumn<DuesInvoice>[] = [
    {
      id: 'period',
      header: 'Bulan',
      width: manage ? 16 : 20,
      rowHeader: !manage,
      render: (invoice) => monthLabel(invoice.period),
    },
    {
      id: 'amount',
      header: 'Nominal',
      width: manage ? 12 : 16,
      kind: 'number',
      render: (invoice) => rupiah(invoice.amount),
    },
    {
      id: 'paymentDate',
      header: 'Tanggal pembayaran',
      width: manage ? 15 : 20,
      render: (invoice) =>
        invoice.payment_date ? (
          <time dateTime={invoice.payment_date}>
            {dateOnly(invoice.payment_date)}
          </time>
        ) : (
          '—'
        ),
    },
    {
      id: 'method',
      header: 'Metode',
      width: manage ? 11 : 13,
      render: (invoice) =>
        invoice.method ? paymentMethods[invoice.method] : '—',
    },
    {
      id: 'status',
      header: 'Status',
      width: manage ? 14 : 18,
      render: (invoice) => (
        <TableBadge
          tone={
            invoice.status === 'lunas'
              ? 'success'
              : invoice.status === 'menunggu_verifikasi'
                ? 'warning'
                : 'danger'
          }
        >
          {duesStatuses[invoice.status]}
        </TableBadge>
      ),
    },
    {
      id: 'action',
      header: 'Aksi',
      width: manage ? 11 : 13,
      render: (invoice) => (
        <TableActionLink
          to={{ pathname: `${base}/${invoice.id}`, search: location.search }}
          aria-label={`Lihat detail ${monthLabel(invoice.period)}${manage ? `, ${invoice.identity_snapshot.full_name}` : ''}`}
        >
          Lihat Detail
        </TableActionLink>
      ),
    },
  ]
  if (manage)
    columns.unshift({
      id: 'resident',
      header: 'Warga',
      width: 21,
      rowHeader: true,
      render: (invoice) => (
        <TableCellText
          secondary={
            invoice.identity_snapshot.house_number
              ? `Nomor rumah ${invoice.identity_snapshot.house_number}`
              : undefined
          }
        >
          {invoice.identity_snapshot.full_name}
        </TableCellText>
      ),
    })
  return (
    <main
      className="@container/page min-w-0 flex-1 p-6 max-sm:px-4"
      aria-labelledby="dues-page-title"
    >
      <div className="mx-auto flex w-full max-w-[96rem] min-w-0 flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4 [&>div]:min-w-0 [&>div]:flex-[1_1_20rem]">
          <PageIntro
            id="dues-page-title"
            title="Iuran Warga"
            description={
              manage
                ? 'Kelola tagihan dan verifikasi pembayaran iuran bulanan warga.'
                : 'Kelola dan pantau pembayaran iuran lingkungan Anda.'
            }
          />
          {manage ? (
            <ButtonLink
              to={{ pathname: `${base}/pengaturan`, search: location.search }}
              variant="outline"
              leadingIcon={<Settings2 size={18} aria-hidden="true" />}
            >
              Pengaturan iuran
            </ButtonLink>
          ) : null}
        </header>
        {isManager(profile?.role) ? (
          <ButtonLink
            to={manage ? '/warga/iuran-warga' : '/admin/iuran-warga'}
            variant="ghost"
            trailingIcon={<ArrowRight size={16} aria-hidden="true" />}
            size="text"
            align="start"
          >
            {manage ? 'Iuran saya' : 'Kelola iuran warga'}
          </ButtonLink>
        ) : null}
        <div className="flex flex-col gap-6" aria-busy={query.isPending}>
          {!query.isError && data ? (
            <>
              {manage ? (
                <SummaryCardView
                  aria-label="Ringkasan iuran periode terpilih"
                  items={[
                    {
                      id: 'total',
                      label: 'Total tagihan',
                      value: data.summary.total,
                    },
                    {
                      id: 'menunggu_verifikasi',
                      label: 'Menunggu Verifikasi',
                      value: data.summary.menunggu_verifikasi,
                    },
                    {
                      id: 'lunas',
                      label: 'Lunas',
                      value: data.summary.lunas,
                    },
                    {
                      id: 'income',
                      label: `Pemasukan iuran ${monthLabel(
                        filters.period ? `${filters.period}-01` : data.period,
                      )}`,
                      value: rupiah(data.summary.income),
                    },
                  ]}
                />
              ) : (
                <>
                  <SummaryCardView
                    aria-label="Ringkasan iuran bulan ini"
                    columns={2}
                    items={[
                      {
                        id: 'amount',
                        label: 'Iuran Bulan Ini',
                        value: data.current ? rupiah(data.current.amount) : '—',
                      },
                      {
                        id: 'status',
                        label: 'Status Pembayaran',
                        value: data.current
                          ? duesStatuses[data.current.status]
                          : 'Belum ada tagihan',
                      },
                    ]}
                  />
                  {data.current ? (
                    <CurrentBill invoice={data.current} />
                  ) : (
                    <p className="block rounded-summary bg-amber-50 p-4 text-sm leading-relaxed wrap-anywhere text-warning forced-colors:border forced-colors:border-[CanvasText]">
                      Belum ada tagihan untuk bulan ini.
                    </p>
                  )}
                </>
              )}
            </>
          ) : null}
        </div>
        <section
          className="flex min-w-0 flex-col gap-3"
          aria-labelledby="dues-history-title"
        >
          <header className="[&_h2]:text-2xl [&_h2]:leading-tight [&_h2]:font-bold [&_p]:mt-1 [&_p]:text-sm [&_p]:leading-relaxed [&_p]:text-muted">
            <h2 id="dues-history-title">
              {manage ? 'Daftar tagihan warga' : 'Riwayat tagihan'}
            </h2>
            <p>
              {manage
                ? 'Pemasukan dihitung berdasarkan tanggal pembayaran yang disahkan.'
                : 'Buka detail untuk melihat pembayaran atau membayar periode sebelumnya.'}
            </p>
          </header>
          <TablePagination
            toolbar={
              <div className="grid min-w-0 gap-3">
                <div
                  className={cn(
                    'grid min-w-0 items-end gap-3 @max-[33rem]/table-pagination:grid-cols-1',
                    manage
                      ? 'grid-cols-[minmax(16rem,1fr)_minmax(11rem,12rem)_minmax(9rem,10.5rem)_minmax(11rem,12rem)] @max-[50rem]/table-pagination:grid-cols-3'
                      : 'grid-cols-[minmax(11rem,1fr)_minmax(9rem,10.5rem)_minmax(11rem,12rem)]',
                  )}
                >
                  {manage ? (
                    <TextInput
                      label="Cari warga"
                      hideLabel
                      wrapperClassName="@max-[50rem]/table-pagination:col-span-full"
                      type="search"
                      placeholder="Cari nama atau nomor rumah"
                      maxLength={200}
                      value={filters.search}
                      leadingIcon={<Search size={18} />}
                      onChange={(event) => change('cari', event.target.value)}
                    />
                  ) : null}
                  <div className="min-w-0">
                    <label className="sr-only" htmlFor="dues-period">
                      Bulan
                    </label>
                    <input
                      id="dues-period"
                      type="month"
                      className="min-h-12 w-full min-w-0 rounded-control border border-control-border bg-surface px-3 py-2.5 text-start font-sans text-base leading-6 text-ink placeholder:text-muted hover:border-slate-600 focus-visible:border-action focus-visible:outline-action disabled:cursor-not-allowed disabled:border-border disabled:bg-soft disabled:text-muted disabled:opacity-100 aria-invalid:border-danger aria-invalid:focus-visible:outline-danger [&[readonly]]:bg-page"
                      min="2000-01"
                      max="9999-12"
                      value={
                        filters.period ||
                        (manage ? (data?.period.slice(0, 7) ?? '') : '')
                      }
                      onChange={(event) => change('bulan', event.target.value)}
                    />
                  </div>
                  <div className="min-w-0">
                    <label className="sr-only" htmlFor="dues-status">
                      Status
                    </label>
                    <Select
                      id="dues-status"
                      value={filters.status}
                      onChange={(event) => change('status', event.target.value)}
                    >
                      <option value="all">Semua status</option>
                      {Object.entries(duesStatuses).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </div>
                  <div className="min-w-0">
                    <label className="sr-only" htmlFor="dues-method">
                      Metode
                    </label>
                    <Select
                      id="dues-method"
                      value={filters.method}
                      onChange={(event) => change('metode', event.target.value)}
                    >
                      <option value="all">Semua metode</option>
                      {Object.entries(paymentMethods).map(([value, label]) => (
                        <option key={value} value={value}>
                          {label}
                        </option>
                      ))}
                    </Select>
                  </div>
                </div>
                {!manage && filters.period ? (
                  <Button
                    type="button"
                    onClick={() => change('bulan', '')}
                    variant="ghost"
                    size="text"
                    align="start"
                  >
                    Semua bulan
                  </Button>
                ) : null}
              </div>
            }
            caption={manage ? 'Tagihan seluruh warga' : 'Tagihan iuran pribadi'}
            columns={columns}
            items={data?.items ?? []}
            getRowKey={(invoice) => invoice.id}
            pagination={{
              page: filters.page,
              pageSize: 10,
              total: data?.total ?? 0,
              itemLabel: 'tagihan',
              label: 'Halaman tagihan iuran',
              onPageChange: (page) => change('halaman', String(page)),
            }}
            isFetching={query.isFetching}
            isLoading={query.isPending}
            loadingMessage="Memuat iuran warga…"
            error={query.isError ? duesError(query.error) : null}
            onRetry={() => void query.refetch()}
            emptyState={{ description: 'Tidak ada tagihan yang sesuai.' }}
          />
        </section>
        <Outlet />
      </div>
    </main>
  )
}
