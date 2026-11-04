import { useEffect } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  FileText,
  MoveHorizontal,
  Plus,
  Search,
} from 'lucide-react'
import { Link, Outlet, useLocation, useSearchParams } from 'react-router'
import { TextInput } from '../../components/TextInput'
import { Feedback } from '../../components/Feedback'
import { PageIntro } from '../../components/PageIntro'
import { SummaryCardView } from '../../components/SummaryCardView'
import type { LetterFilters, LetterStatus } from '../../lib/database.types'
import { useAuth } from '../auth/AuthProvider'
import { formatDate, isManager } from '../residents/data'
import {
  eligibilityMessage,
  isLetterStatus,
  isLetterType,
  letterError,
  letterStatuses,
  letterTypes,
  useLetters,
  useLetterSummary,
} from './data'
import { LetterStatusBadge } from './LetterStatusBadge'

export default function LettersPage({ manage = false }: { manage?: boolean }) {
  const [params, setParams] = useSearchParams()
  const { profile } = useAuth()
  const location = useLocation()
  const status = params.get('status') ?? ''
  const type = params.get('type') ?? ''
  const filters: LetterFilters = {
    search: (params.get('search') ?? '').slice(0, 200),
    status: isLetterStatus(status) ? status : 'all',
    type: isLetterType(type) ? type : 'all',
    sort: params.get('sort') === 'oldest' ? 'oldest' : 'newest',
    page: Math.min(
      1000000,
      Math.max(1, Math.floor(Number(params.get('page')) || 1)),
    ),
  }
  const directory = useLetters(manage, filters)
  const summary = useLetterSummary(manage)
  const base = `${manage ? '/admin' : '/warga'}/pengajuan-surat`
  const waiting = manage && filters.status === 'pengajuan'
  const total = directory.data?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / 4))
  const blocked = profile && !manage ? eligibilityMessage(profile) : null
  const change = (key: string, value: string) =>
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        if (['', 'all'].includes(value) || (key === 'page' && value === '1'))
          next.delete(key)
        else next.set(key, value)
        if (key !== 'page') next.delete('page')
        return next
      },
      { replace: true },
    )
  useEffect(() => {
    if (directory.isSuccess && filters.page > pageCount)
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous)
          next.delete('page')
          return next
        },
        { replace: true },
      )
  }, [directory.isSuccess, filters.page, pageCount, setParams])
  return (
    <main
      className="@container/page min-w-0 flex-1 p-6 max-sm:px-4"
      aria-labelledby="letters-page-title"
    >
      <div className="mx-auto flex w-full max-w-[96rem] min-w-0 flex-col gap-6">
        <header className="flex items-center justify-between gap-4 @max-[600px]/page:flex-col @max-[600px]/page:items-start [&>a]:shrink-0">
          <PageIntro
            id="letters-page-title"
            title={waiting ? 'Pengajuan Belum Diproses' : 'Pengajuan Surat'}
            description={
              manage
                ? waiting
                  ? 'Daftar pengajuan surat warga yang belum mulai diproses.'
                  : 'Kelola permohonan surat dari warga'
                : 'Ajukan kebutuhan administrasi Anda dengan mudah melalui ErTee.'
            }
          />
          {manage ? (
            waiting ? (
              <Link
                className="inline-flex min-h-12 max-w-full shrink-0 items-center justify-center gap-2 rounded-control border border-border bg-surface px-5 py-3 text-center text-sm leading-5 font-bold wrap-anywhere text-slate-700 enabled:cursor-pointer enabled:hover:bg-page disabled:cursor-wait disabled:opacity-65 motion-safe:transition-colors motion-safe:duration-150 [&>svg]:shrink-0"
                to="/admin/pengajuan-surat"
              >
                <ArrowLeft size={18} aria-hidden="true" />
                Semua pengajuan
              </Link>
            ) : (
              <Link
                className="inline-flex min-h-12 max-w-full shrink-0 items-center justify-center gap-2 rounded-control border border-border bg-surface px-5 py-3 text-center text-sm leading-5 font-bold wrap-anywhere text-slate-700 enabled:cursor-pointer enabled:hover:bg-page disabled:cursor-wait disabled:opacity-65 motion-safe:transition-colors motion-safe:duration-150 [&>svg]:shrink-0"
                to="/warga/pengajuan-surat"
              >
                Pengajuan saya
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            )
          ) : (
            <Link
              className="inline-flex min-h-12 max-w-full shrink-0 items-center justify-center gap-2 rounded-control border border-transparent bg-action px-5 py-3 text-center text-sm leading-5 font-bold wrap-anywhere text-white enabled:cursor-pointer enabled:hover:bg-action-hover disabled:cursor-wait disabled:opacity-65 motion-safe:transition-colors motion-safe:duration-150 forced-colors:border-[ButtonText] [&>svg]:shrink-0"
              to={{ pathname: `${base}/tambah`, search: location.search }}
            >
              <Plus size={20} aria-hidden="true" />
              Ajukan Surat
            </Link>
          )}
        </header>
        {!manage && isManager(profile?.role) ? (
          <Link
            className="inline-flex min-h-11 max-w-full items-center gap-2 border-0 bg-transparent p-0 text-start text-sm leading-5 font-bold wrap-anywhere text-action hover:underline disabled:cursor-wait disabled:opacity-65 [&>svg]:shrink-0"
            to="/admin/pengajuan-surat"
          >
            Kelola seluruh pengajuan warga{' '}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        ) : null}
        {blocked ? (
          <div className="rounded-summary border border-amber-300 bg-amber-50 px-5 py-4 text-sm leading-relaxed text-warning">
            <p>{blocked}</p>
            <Link
              className="inline-flex min-h-11 max-w-full items-center gap-2 border-0 bg-transparent p-0 text-start text-sm leading-5 font-bold wrap-anywhere text-action hover:underline disabled:cursor-wait disabled:opacity-65 [&>svg]:shrink-0"
              to="/warga/profil"
            >
              Periksa profil saya <ArrowRight size={16} aria-hidden="true" />
            </Link>
          </div>
        ) : null}
        {manage ? (
          <section
            aria-label="Ringkasan pengajuan surat"
            aria-busy={summary.isPending}
          >
            {summary.isError ? (
              <div className="my-3 flex flex-col gap-2">
                <Feedback>{letterError(summary.error)}</Feedback>
                <button
                  type="button"
                  className="inline-flex min-h-11 max-w-full items-center gap-2 border-0 bg-transparent p-0 text-start text-sm leading-5 font-bold wrap-anywhere text-action hover:underline disabled:cursor-wait disabled:opacity-65 [&>svg]:shrink-0"
                  onClick={() => void summary.refetch()}
                >
                  Coba lagi ringkasan
                </button>
              </div>
            ) : (
              <SummaryCardView
                items={[
                  {
                    id: 'total',
                    label: 'Total Pengajuan',
                    value: summary.data?.total ?? '—',
                  },
                  {
                    id: 'pengajuan',
                    label: 'Pengajuan',
                    value: summary.data?.pengajuan ?? '—',
                  },
                  {
                    id: 'diproses',
                    label: letterStatuses.diproses,
                    value: summary.data?.diproses ?? '—',
                  },
                  {
                    id: 'selesai',
                    label: letterStatuses.selesai,
                    value: summary.data?.selesai ?? '—',
                  },
                ]}
              />
            )}
          </section>
        ) : null}
        <section
          className="flex min-w-0 flex-col gap-4"
          aria-label={
            manage ? 'Daftar pengajuan warga' : 'Daftar pengajuan saya'
          }
        >
          <div className="grid grid-cols-[minmax(200px,1fr)_minmax(130px,0.3fr)_minmax(150px,0.4fr)_minmax(120px,0.25fr)] items-start gap-3 has-[>:nth-child(3):last-child]:grid-cols-[minmax(200px,1fr)_minmax(130px,0.3fr)_minmax(120px,0.25fr)] @max-[1000px]/page:grid-cols-3 @max-[1000px]/page:has-[>:nth-child(3):last-child]:grid-cols-2 @max-[600px]/page:grid-cols-2 @max-[1000px]/page:[&>:first-child]:col-span-full @max-[600px]/page:[&>div:has(select)]:col-span-full">
            <TextInput
              label="Cari pengajuan"
              type="search"
              placeholder={
                manage
                  ? 'Cari nama atau jenis surat'
                  : 'Cari jenis atau nomor pengajuan'
              }
              value={filters.search}
              maxLength={200}
              onChange={(event) => change('search', event.target.value)}
              leadingIcon={<Search size={18} />}
            />
            <div className="flex min-w-0 flex-col gap-1.5 [&>label]:text-sm [&>label]:leading-5 [&>label]:font-semibold [&>label]:text-slate-700">
              <label htmlFor="letter-status-filter">Status</label>
              <select
                className="min-h-12 w-full min-w-0 rounded-control border border-control-border bg-surface px-3 py-2.5 pe-8 text-start font-sans text-base leading-6 text-ellipsis text-ink placeholder:text-muted hover:border-slate-600 focus-visible:border-action focus-visible:outline-action disabled:cursor-not-allowed disabled:border-border disabled:bg-soft disabled:text-muted disabled:opacity-100 aria-invalid:border-danger aria-invalid:focus-visible:outline-danger [&[readonly]]:bg-page"
                id="letter-status-filter"
                value={filters.status}
                onChange={(event) => change('status', event.target.value)}
              >
                <option value="all">Semua status</option>
                {Object.entries(letterStatuses).map(([key, label]) => (
                  <option key={key} value={key}>
                    {label}
                  </option>
                ))}
              </select>
            </div>
            {manage ? (
              <div className="flex min-w-0 flex-col gap-1.5 [&>label]:text-sm [&>label]:leading-5 [&>label]:font-semibold [&>label]:text-slate-700">
                <label htmlFor="letter-type-filter">Jenis surat</label>
                <select
                  className="min-h-12 w-full min-w-0 rounded-control border border-control-border bg-surface px-3 py-2.5 pe-8 text-start font-sans text-base leading-6 text-ellipsis text-ink placeholder:text-muted hover:border-slate-600 focus-visible:border-action focus-visible:outline-action disabled:cursor-not-allowed disabled:border-border disabled:bg-soft disabled:text-muted disabled:opacity-100 aria-invalid:border-danger aria-invalid:focus-visible:outline-danger [&[readonly]]:bg-page"
                  id="letter-type-filter"
                  value={filters.type}
                  onChange={(event) => change('type', event.target.value)}
                >
                  <option value="all">Semua jenis</option>
                  {Object.entries(letterTypes).map(([key, label]) => (
                    <option key={key} value={key}>
                      {label}
                    </option>
                  ))}
                </select>
              </div>
            ) : null}
            <div className="flex min-w-0 flex-col gap-1.5 [&>label]:text-sm [&>label]:leading-5 [&>label]:font-semibold [&>label]:text-slate-700">
              <label htmlFor="letter-sort-filter">Urutan</label>
              <select
                className="min-h-12 w-full min-w-0 rounded-control border border-control-border bg-surface px-3 py-2.5 pe-8 text-start font-sans text-base leading-6 text-ellipsis text-ink placeholder:text-muted hover:border-slate-600 focus-visible:border-action focus-visible:outline-action disabled:cursor-not-allowed disabled:border-border disabled:bg-soft disabled:text-muted disabled:opacity-100 aria-invalid:border-danger aria-invalid:focus-visible:outline-danger [&[readonly]]:bg-page"
                id="letter-sort-filter"
                value={filters.sort}
                onChange={(event) => change('sort', event.target.value)}
              >
                <option value="newest">Terbaru</option>
                <option value="oldest">Terlama</option>
              </select>
            </div>
          </div>
          <div aria-live="polite" className="sr-only">
            {directory.isFetching
              ? 'Memuat pengajuan'
              : `${total} pengajuan ditemukan`}
          </div>
          {directory.isPending ? (
            <p
              className="flex flex-col items-center gap-3 rounded-card border border-border bg-surface px-5 py-12 text-center leading-normal text-muted [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-ink"
              role="status"
            >
              Memuat pengajuan surat…
            </p>
          ) : directory.isError ? (
            <div className="flex flex-col gap-4 py-3 [&>button]:self-start">
              <Feedback>{letterError(directory.error)}</Feedback>
              <button
                type="button"
                className="inline-flex min-h-12 max-w-full shrink-0 items-center justify-center gap-2 rounded-control border border-border bg-surface px-5 py-3 text-center text-sm leading-5 font-bold wrap-anywhere text-slate-700 enabled:cursor-pointer enabled:hover:bg-page disabled:cursor-wait disabled:opacity-65 motion-safe:transition-colors motion-safe:duration-150 [&>svg]:shrink-0"
                onClick={() => void directory.refetch()}
              >
                Coba lagi pengajuan
              </button>
            </div>
          ) : !directory.data.items.length ? (
            <div className="flex flex-col items-center gap-3 rounded-card border border-border bg-surface px-5 py-12 text-center leading-normal text-muted [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-ink">
              <FileText size={36} aria-hidden="true" />
              <h2>
                {filters.search ||
                filters.status !== 'all' ||
                filters.type !== 'all'
                  ? 'Pengajuan tidak ditemukan'
                  : 'Belum ada pengajuan surat'}
              </h2>
              <p>
                {manage
                  ? 'Pengajuan warga akan muncul di sini.'
                  : 'Ajukan surat pertama Anda melalui tombol Ajukan Surat.'}
              </p>
            </div>
          ) : (
            <>
              <p className="hidden items-center gap-2 text-xs text-muted @max-[1000px]/page:flex">
                <MoveHorizontal size={16} aria-hidden="true" />
                Geser tabel untuk melihat seluruh informasi.
              </p>
              <div
                className="overflow-x-auto overscroll-x-contain rounded-card border border-border bg-surface"
                role="region"
                aria-label="Tabel pengajuan surat, dapat digulir"
                tabIndex={0}
                aria-busy={directory.isFetching}
              >
                <table className="w-full min-w-[760px] border-collapse text-start text-sm leading-normal [&_tbody_th]:min-w-[170px] [&_tbody_th]:font-bold [&_tbody_tr:last-child>*]:border-b-0 [&_td]:border-b [&_td]:border-border [&_td]:px-6 [&_td]:py-5 [&_td]:text-start [&_td]:text-slate-700 [&_td_time]:whitespace-nowrap [&_td_time]:text-muted [&_td_time]:tabular-nums [&_td:last-child]:whitespace-nowrap [&_th]:border-b [&_th]:border-border [&_th]:px-6 [&_th]:py-5 [&_th]:text-start [&_thead]:bg-soft [&_thead]:text-muted [&_thead_th]:py-3 [&_thead_th]:text-xs [&_thead_th]:font-bold [&_thead_th]:whitespace-nowrap">
                  <caption className="sr-only">
                    {manage
                      ? 'Pengajuan surat seluruh warga'
                      : 'Pengajuan surat milik sendiri'}
                  </caption>
                  <thead>
                    <tr>
                      {waiting ? <th scope="col">NO.</th> : null}
                      <th scope="col">
                        {manage ? 'NAMA WARGA' : 'NOMOR PENGAJUAN'}
                      </th>
                      {waiting ? <th scope="col">BLOK</th> : null}
                      <th scope="col">JENIS SURAT</th>
                      <th scope="col">TANGGAL</th>
                      <th scope="col">STATUS</th>
                      <th scope="col">AKSI</th>
                    </tr>
                  </thead>
                  <tbody>
                    {directory.data.items.map((request, index) => (
                      <tr key={request.id}>
                        {waiting ? (
                          <td>
                            {String(
                              (filters.page - 1) * 4 + index + 1,
                            ).padStart(2, '0')}
                          </td>
                        ) : null}
                        <th scope="row">
                          {manage
                            ? request.identity_snapshot.full_name
                            : request.reference}
                        </th>
                        {waiting ? (
                          <td>{request.identity_snapshot.house_block}</td>
                        ) : null}
                        <td>{request.letter_type_label}</td>
                        <td>
                          <time dateTime={request.created_at}>
                            {formatDate(request.created_at)}
                          </time>
                        </td>
                        <td>
                          <LetterStatusBadge
                            status={request.status as LetterStatus}
                          />
                        </td>
                        <td>
                          <Link
                            className="inline-flex min-h-11 max-w-full items-center gap-2 border-0 bg-transparent p-0 text-start text-sm leading-5 font-bold wrap-anywhere text-action hover:underline disabled:cursor-wait disabled:opacity-65 [&>svg]:shrink-0"
                            to={{
                              pathname: `${base}/${request.id}`,
                              search: location.search,
                            }}
                            aria-label={`Lihat pengajuan ${request.reference}`}
                          >
                            Lihat <ArrowRight size={16} aria-hidden="true" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <footer className="flex flex-wrap items-center justify-between gap-4 text-sm leading-normal text-muted @max-[600px]/page:flex-col @max-[600px]/page:items-start [&>nav]:flex [&>nav]:shrink-0 [&>nav]:items-center [&>nav]:gap-2 [&>nav]:font-bold [&>nav]:text-ink [&>nav]:tabular-nums @max-[600px]/page:[&>nav]:self-end">
                <p>
                  Menampilkan {(filters.page - 1) * 4 + 1}–
                  {Math.min(filters.page * 4, total)} dari {total} pengajuan
                </p>
                <nav aria-label="Halaman pengajuan surat">
                  <button
                    type="button"
                    className="inline-flex size-11 shrink-0 items-center justify-center rounded-control border border-border bg-surface p-2 text-muted enabled:hover:bg-soft disabled:cursor-default disabled:opacity-40"
                    disabled={filters.page <= 1}
                    aria-label="Halaman sebelumnya"
                    onClick={() => change('page', String(filters.page - 1))}
                  >
                    <ChevronLeft size={18} aria-hidden="true" />
                  </button>
                  <span aria-current="page">
                    {filters.page} / {pageCount}
                  </span>
                  <button
                    type="button"
                    className="inline-flex size-11 shrink-0 items-center justify-center rounded-control border border-border bg-surface p-2 text-muted enabled:hover:bg-soft disabled:cursor-default disabled:opacity-40"
                    disabled={filters.page >= pageCount}
                    aria-label="Halaman berikutnya"
                    onClick={() => change('page', String(filters.page + 1))}
                  >
                    <ChevronRight size={18} aria-hidden="true" />
                  </button>
                </nav>
              </footer>
            </>
          )}
        </section>
      </div>
      <Outlet />
    </main>
  )
}
