import { useEffect } from 'react'
import { ArrowLeft, ArrowRight, FileText, Plus, Search } from 'lucide-react'
import { Outlet, useLocation, useSearchParams } from 'react-router'
import { ButtonLink, Button } from '../../components/Button'
import { TextInput } from '../../components/TextInput'
import { Feedback } from '../../components/Feedback'
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
      width: waiting ? 22 : 24,
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
      width: waiting ? 21 : 24,
      render: (request) => request.letter_type_label,
    },
    {
      id: 'date',
      header: 'Tanggal',
      width: waiting ? 17 : 22,
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
  }
  return (
    <main
      className="@container/page min-w-0 flex-1 p-6 max-sm:px-4"
      aria-labelledby="letters-page-title"
    >
      <div className="mx-auto flex w-full max-w-[96rem] min-w-0 flex-col gap-6">
        <header className="flex items-center justify-between gap-4 @max-[600px]/page:flex-col @max-[600px]/page:items-start">
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
              <ButtonLink
                to="/admin/pengajuan-surat"
                variant="outline"
                leadingIcon={<ArrowLeft size={18} aria-hidden="true" />}
              >
                Semua pengajuan
              </ButtonLink>
            ) : (
              <ButtonLink
                to="/warga/pengajuan-surat"
                variant="outline"
                trailingIcon={<ArrowRight size={18} aria-hidden="true" />}
              >
                Pengajuan saya
              </ButtonLink>
            )
          ) : (
            <ButtonLink
              to={{ pathname: `${base}/tambah`, search: location.search }}
              variant="solid"
              leadingIcon={<Plus size={20} aria-hidden="true" />}
            >
              Ajukan Surat
            </ButtonLink>
          )}
        </header>
        {!manage && isManager(profile?.role) ? (
          <ButtonLink
            to="/admin/pengajuan-surat"
            variant="ghost"
            trailingIcon={<ArrowRight size={16} aria-hidden="true" />}
            size="text"
            align="start"
          >
            Kelola seluruh pengajuan warga{' '}
          </ButtonLink>
        ) : null}
        {blocked ? (
          <div className="rounded-summary border border-amber-300 bg-amber-50 px-5 py-4 text-sm leading-relaxed text-warning">
            <p>{blocked}</p>
            <ButtonLink
              to="/warga/profil"
              variant="ghost"
              trailingIcon={<ArrowRight size={16} aria-hidden="true" />}
              size="text"
              align="start"
            >
              Periksa profil saya
            </ButtonLink>
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
                <Button
                  type="button"
                  onClick={() => void summary.refetch()}
                  variant="ghost"
                  size="text"
                  align="start"
                >
                  Coba lagi ringkasan
                </Button>
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
                  <Select
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
                  </Select>
                </div>
                {manage ? (
                  <div className="min-w-0">
                    <label className="sr-only" htmlFor="letter-type-filter">
                      Jenis surat
                    </label>
                    <Select
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
                    </Select>
                  </div>
                ) : null}
                <div className="min-w-0">
                  <label className="sr-only" htmlFor="letter-sort-filter">
                    Urutan
                  </label>
                  <Select
                    id="letter-sort-filter"
                    value={filters.sort}
                    onChange={(event) => change('sort', event.target.value)}
                  >
                    <option value="newest">Terbaru</option>
                    <option value="oldest">Terlama</option>
                  </Select>
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
