import { useEffect } from 'react'
import { ArrowLeft, ArrowRight, FileText, Plus, Search } from 'lucide-react'
import { Link, Outlet, useLocation, useSearchParams } from 'react-router'
import { TextInput } from '../../components/TextInput'
import { Feedback } from '../../components/Feedback'
import { PageIntro } from '../../components/PageIntro'
import { SummaryCardView } from '../../components/SummaryCardView'
import {
  TableActionLink,
  TableBadge,
  TableCellText,
  TablePagination,
} from '../../components/TablePagination'
import type { TablePaginationColumn } from '../../components/TablePagination'
import type { LetterFilters, LetterRequest } from '../../lib/database.types'
import { cn } from '../../lib/cn'
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
  const columns: TablePaginationColumn<LetterRequest>[] = [
    {
      id: 'applicant',
      header: manage ? 'Nama warga' : 'Nomor pengajuan',
      width: waiting ? 23 : 24,
      rowHeader: true,
      render: (request) => (
        <TableCellText>
          {manage ? request.identity_snapshot.full_name : request.reference}
        </TableCellText>
      ),
    },
    {
      id: 'type',
      header: 'Jenis surat',
      width: waiting ? 22 : 24,
      render: (request) => request.letter_type_label,
    },
    {
      id: 'date',
      header: 'Tanggal',
      width: waiting ? 18 : 22,
      render: (request) => (
        <time dateTime={request.created_at}>
          {formatDate(request.created_at)}
        </time>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      width: waiting ? 13 : 16,
      render: (request) => (
        <TableBadge
          tone={
            request.status === 'selesai'
              ? 'success'
              : request.status === 'diproses'
                ? 'info'
                : 'warning'
          }
        >
          {letterStatuses[request.status]}
        </TableBadge>
      ),
    },
    {
      id: 'action',
      header: 'Aksi',
      width: waiting ? 11 : 14,
      render: (request) => (
        <TableActionLink
          to={{ pathname: `${base}/${request.id}`, search: location.search }}
          aria-label={`Lihat pengajuan ${request.reference}`}
        >
          Lihat
        </TableActionLink>
      ),
    },
  ]
  if (waiting) {
    columns.unshift({
      id: 'number',
      header: 'No.',
      width: 6,
      kind: 'number',
      render: (_request, index) =>
        String((filters.page - 1) * 4 + index + 1).padStart(2, '0'),
    })
    columns.splice(2, 0, {
      id: 'block',
      header: 'Blok',
      width: 7,
      render: (request) => request.identity_snapshot.house_block,
    })
  }
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
          className="min-w-0"
          aria-label={
            manage ? 'Daftar pengajuan warga' : 'Daftar pengajuan saya'
          }
        >
          <TablePagination
            toolbar={
              <div
                className={cn(
                  'grid min-w-0 items-start gap-3 @max-[33rem]/table-pagination:grid-cols-1',
                  manage
                    ? 'grid-cols-[minmax(16rem,1fr)_repeat(3,minmax(9rem,10.5rem))] @max-[48rem]/table-pagination:grid-cols-3'
                    : 'grid-cols-[minmax(16rem,1fr)_repeat(2,minmax(9rem,10.5rem))] @max-[40rem]/table-pagination:grid-cols-2',
                )}
              >
                <TextInput
                  label="Cari pengajuan"
                  hideLabel
                  wrapperClassName={
                    manage
                      ? '@max-[48rem]/table-pagination:col-span-full'
                      : '@max-[40rem]/table-pagination:col-span-full'
                  }
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
                <div className="min-w-0">
                  <label className="sr-only" htmlFor="letter-status-filter">
                    Status
                  </label>
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
                  <div className="min-w-0">
                    <label className="sr-only" htmlFor="letter-type-filter">
                      Jenis surat
                    </label>
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
                <div className="min-w-0">
                  <label className="sr-only" htmlFor="letter-sort-filter">
                    Urutan
                  </label>
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
            }
            caption={
              manage
                ? 'Pengajuan surat seluruh warga'
                : 'Pengajuan surat milik sendiri'
            }
            columns={columns}
            items={directory.data?.items ?? []}
            getRowKey={(request) => request.id}
            pagination={{
              page: filters.page,
              pageSize: 4,
              total,
              itemLabel: 'pengajuan',
              label: 'Halaman pengajuan surat',
              onPageChange: (page) => change('page', String(page)),
            }}
            isFetching={directory.isFetching}
            isLoading={directory.isPending}
            loadingMessage="Memuat pengajuan surat…"
            error={directory.isError ? letterError(directory.error) : null}
            onRetry={() => void directory.refetch()}
            retryLabel="Coba lagi pengajuan"
            emptyState={{
              icon: FileText,
              title:
                filters.search ||
                filters.status !== 'all' ||
                filters.type !== 'all'
                  ? 'Pengajuan tidak ditemukan'
                  : 'Belum ada pengajuan surat',
              description: manage
                ? 'Pengajuan warga akan muncul di sini.'
                : 'Ajukan surat pertama Anda melalui tombol Ajukan Surat.',
            }}
          />
        </section>
      </div>
      <Outlet />
    </main>
  )
}
