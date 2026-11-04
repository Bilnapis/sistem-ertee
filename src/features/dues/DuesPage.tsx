import { useEffect } from 'react'
import {
  ArrowRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  MoveHorizontal,
  Search,
  Settings2,
  Wallet,
} from 'lucide-react'
import { Link, Outlet, useLocation, useSearchParams } from 'react-router'
import { Feedback } from '../../components/Feedback'
import { SummaryCardView } from '../../components/SummaryCardView'
import { TextInput } from '../../components/TextInput'
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
import styles from './Dues.module.css'

function CurrentBill({ invoice }: { invoice: DuesInvoice }) {
  const location = useLocation()
  const destination = (suffix = '') => ({
    pathname: `/warga/iuran-warga/${invoice.id}${suffix}`,
    search: location.search,
  })
  return (
    <section className={styles.bill} aria-labelledby="dues-bill-title">
      <div className={styles.billHeading}>
        <h2 id="dues-bill-title">Tagihan Iuran</h2>
        <DuesStatusBadge status={invoice.status} />
      </div>
      <dl className={styles.billDetails}>
        <div>
          <dt>Nama Warga</dt>
          <dd>{invoice.identity_snapshot.full_name}</dd>
        </div>
        <div>
          <dt>Blok Rumah</dt>
          <dd>
            {[
              invoice.identity_snapshot.house_block,
              invoice.identity_snapshot.house_number,
            ]
              .filter(Boolean)
              .join(' / ')}
          </dd>
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
        <p className={styles.success}>
          <CheckCircle2 size={20} aria-hidden="true" />
          Pembayaran {monthLabel(invoice.period)} telah diverifikasi pengurus.
        </p>
      ) : invoice.status === 'menunggu_verifikasi' ? (
        <p className={styles.notice}>
          Konfirmasi pembayaran sudah dikirim. Pengurus akan memeriksa
          pembayaran Anda.
        </p>
      ) : null}
      <div className={styles.billActions}>
        {invoice.status === 'belum_bayar' ? (
          <Link className={styles.primary} to={destination('/bayar')}>
            <Wallet size={19} aria-hidden="true" />
            Bayar Iuran
          </Link>
        ) : null}
        <Link className={styles.textLink} to={destination()}>
          Lihat detail <ArrowRight size={16} aria-hidden="true" />
        </Link>
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
  return (
    <main className={styles.page} aria-labelledby="dues-page-title">
      <div className={styles.pageContent}>
        <header className={styles.pageHeader}>
          <div>
            <h1 id="dues-page-title">Iuran Warga</h1>
            <p>
              {manage
                ? 'Kelola tagihan dan verifikasi pembayaran iuran bulanan warga.'
                : 'Kelola dan pantau pembayaran iuran lingkungan Anda.'}
            </p>
          </div>
          {manage ? (
            <Link
              className={styles.secondary}
              to={{ pathname: `${base}/pengaturan`, search: location.search }}
            >
              <Settings2 size={18} aria-hidden="true" />
              Pengaturan iuran
            </Link>
          ) : null}
        </header>
        {isManager(profile?.role) ? (
          <Link
            className={styles.textLink}
            to={manage ? '/warga/iuran-warga' : '/admin/iuran-warga'}
          >
            {manage ? 'Iuran saya' : 'Kelola iuran warga'}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        ) : null}
        <div className={styles.overview} aria-busy={query.isPending}>
          {query.isPending ? (
            <p className={styles.notice} role="status">
              Memuat iuran warga…
            </p>
          ) : query.isError ? (
            <div className={styles.feedback}>
              <Feedback>{duesError(query.error)}</Feedback>
              <button
                type="button"
                className={styles.secondary}
                onClick={() => void query.refetch()}
              >
                Coba lagi
              </button>
            </div>
          ) : data ? (
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
                    <p className={styles.notice}>
                      Belum ada tagihan untuk bulan ini.
                    </p>
                  )}
                </>
              )}
            </>
          ) : null}
        </div>
        <section className={styles.list} aria-labelledby="dues-history-title">
          <header className={styles.listHeader}>
            <h2 id="dues-history-title">
              {manage ? 'Daftar tagihan warga' : 'Riwayat tagihan'}
            </h2>
            <p>
              {manage
                ? 'Pemasukan dihitung berdasarkan tanggal pembayaran yang disahkan.'
                : 'Buka detail untuk melihat pembayaran atau membayar periode sebelumnya.'}
            </p>
          </header>
          <div className={styles.filters}>
            {manage ? (
              <TextInput
                label="Cari warga"
                type="search"
                placeholder="Cari nama atau blok rumah"
                maxLength={200}
                value={filters.search}
                leadingIcon={<Search size={18} />}
                onChange={(event) => change('cari', event.target.value)}
              />
            ) : null}
            <div className={styles.field}>
              <label htmlFor="dues-period">Bulan</label>
              <input
                id="dues-period"
                type="month"
                min="2000-01"
                max="9999-12"
                value={
                  filters.period ||
                  (manage ? (data?.period.slice(0, 7) ?? '') : '')
                }
                onChange={(event) => change('bulan', event.target.value)}
              />
              {!manage && filters.period ? (
                <button
                  type="button"
                  className={styles.textLink}
                  onClick={() => change('bulan', '')}
                >
                  Semua bulan
                </button>
              ) : null}
            </div>
            <div className={styles.field}>
              <label htmlFor="dues-status">Status</label>
              <select
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
              </select>
            </div>
            <div className={styles.field}>
              <label htmlFor="dues-method">Metode</label>
              <select
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
              </select>
            </div>
          </div>
          <p className={styles.scrollHint}>
            <MoveHorizontal size={16} aria-hidden="true" />
            Geser tabel untuk melihat seluruh kolom.
          </p>
          <div
            className={styles.tableRegion}
            role="region"
            aria-label="Tabel tagihan iuran"
            tabIndex={0}
            aria-busy={query.isFetching}
          >
            <table>
              <caption className={styles.srOnly}>
                {manage ? 'Tagihan seluruh warga' : 'Tagihan iuran pribadi'}
              </caption>
              <thead>
                <tr>
                  {manage ? <th scope="col">Warga</th> : null}
                  <th scope="col">Bulan</th>
                  <th scope="col">Nominal</th>
                  <th scope="col">Tanggal pembayaran</th>
                  <th scope="col">Metode</th>
                  <th scope="col">Status</th>
                  <th scope="col">Aksi</th>
                </tr>
              </thead>
              <tbody>
                {data?.items.map((invoice) => (
                  <tr key={invoice.id}>
                    {manage ? (
                      <td>
                        <strong>{invoice.identity_snapshot.full_name}</strong>
                        <small>
                          {[
                            invoice.identity_snapshot.house_block,
                            invoice.identity_snapshot.house_number,
                          ]
                            .filter(Boolean)
                            .join(' / ')}
                        </small>
                      </td>
                    ) : null}
                    <th scope="row">{monthLabel(invoice.period)}</th>
                    <td>{rupiah(invoice.amount)}</td>
                    <td>
                      {invoice.payment_date
                        ? dateOnly(invoice.payment_date)
                        : '—'}
                    </td>
                    <td>
                      {invoice.method ? paymentMethods[invoice.method] : '—'}
                    </td>
                    <td>
                      <DuesStatusBadge status={invoice.status} />
                    </td>
                    <td>
                      <Link
                        className={styles.textLink}
                        aria-label={`Lihat detail ${monthLabel(invoice.period)}${manage ? `, ${invoice.identity_snapshot.full_name}` : ''}`}
                        to={{
                          pathname: `${base}/${invoice.id}`,
                          search: location.search,
                        }}
                      >
                        Lihat Detail
                      </Link>
                    </td>
                  </tr>
                ))}
                {!data?.items.length ? (
                  <tr>
                    <td colSpan={manage ? 7 : 6} className={styles.empty}>
                      {query.isPending
                        ? 'Memuat riwayat…'
                        : query.isError
                          ? 'Riwayat belum dapat dimuat.'
                          : 'Tidak ada tagihan yang sesuai.'}
                    </td>
                  </tr>
                ) : null}
              </tbody>
            </table>
          </div>
          <footer className={styles.pagination}>
            <span>
              {data?.total ?? 0} tagihan · Halaman {filters.page} dari {pages}
            </span>
            <div>
              <button
                type="button"
                className={styles.iconButton}
                aria-label="Halaman sebelumnya"
                disabled={filters.page <= 1 || query.isFetching}
                onClick={() => change('halaman', String(filters.page - 1))}
              >
                <ChevronLeft size={19} />
              </button>
              <button
                type="button"
                className={styles.iconButton}
                aria-label="Halaman berikutnya"
                disabled={filters.page >= pages || query.isFetching}
                onClick={() => change('halaman', String(filters.page + 1))}
              >
                <ChevronRight size={19} />
              </button>
            </div>
          </footer>
        </section>
        <Outlet />
      </div>
    </main>
  )
}
