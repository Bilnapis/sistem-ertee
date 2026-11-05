import { useEffect } from 'react'
import {
  Link,
  Outlet,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router'
import { ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { PageIntro } from '../../components/PageIntro'
import { TextInput } from '../../components/TextInput'
import {
  TablePagination,
  TableActionLink,
  TableCellText,
} from '../../components/TablePagination'
import type { TablePaginationColumn } from '../../components/TablePagination'
import { useAuth } from '../auth/AuthProvider'
import { formatDate, isManager } from '../residents/data'
import { announcementStatus } from './schedule'
import {
  announcementStatuses,
  announcementError,
  isAnnouncementStatus,
  useAnnouncements,
} from './data'
import {
  AnnouncementCards,
  AnnouncementState,
  AnnouncementStatusBadge,
} from './AnnouncementParts'
import type { Announcement, AnnouncementFilters } from './types'

export default function AnnouncementsPage({
  manage = false,
}: {
  manage?: boolean
}) {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { profile } = useAuth()
  const rawStatus = params.get('status') ?? ''
  const filters: AnnouncementFilters = {
    search: (params.get('search') ?? '').slice(0, 200),
    status: manage && isAnnouncementStatus(rawStatus) ? rawStatus : 'all',
    page: Math.min(
      1000000,
      Math.max(1, Math.floor(Number(params.get('page')) || 1)),
    ),
  }
  const query = useAnnouncements(manage ? 'manage' : 'active', filters)
  const base = `${manage ? '/admin' : '/warga'}/pengumuman`
  const total = query.data?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / 4))
  const change = (key: string, value: string) => {
    const next = new URLSearchParams(window.location.search)
    if (!value || value === 'all' || (key === 'page' && value === '1'))
      next.delete(key)
    else next.set(key, value)
    if (key !== 'page') next.delete('page')
    navigate({ pathname: base, search: next.toString() }, { replace: true })
  }
  useEffect(() => {
    if (query.isSuccess && filters.page > pageCount)
      setParams(
        (previous) => {
          const next = new URLSearchParams(previous)
          next.delete('page')
          return next
        },
        { replace: true },
      )
  }, [query.isSuccess, filters.page, pageCount, setParams])
  const columns: TablePaginationColumn<Announcement>[] = [
    {
      id: 'title',
      header: 'Judul',
      width: 28,
      rowHeader: true,
      render: (a) => <TableCellText>{a.title}</TableCellText>,
    },
    {
      id: 'starts',
      header: 'Mulai tayang',
      width: 20,
      render: (a) => (
        <time dateTime={a.starts_at}>{formatDate(a.starts_at)}</time>
      ),
    },
    {
      id: 'ends',
      header: 'Selesai tayang',
      width: 20,
      render: (a) => <time dateTime={a.ends_at}>{formatDate(a.ends_at)}</time>,
    },
    {
      id: 'status',
      header: 'Status',
      width: 19,
      render: (a) =>
        query.now !== undefined ? (
          <AnnouncementStatusBadge status={announcementStatus(a, query.now)} />
        ) : (
          '—'
        ),
    },
    {
      id: 'action',
      header: 'Aksi',
      width: 13,
      render: (a) => (
        <TableActionLink
          to={{ pathname: `${base}/${a.id}`, search: location.search }}
          aria-label={`Lihat pengumuman ${a.title}`}
        >
          Lihat
        </TableActionLink>
      ),
    },
  ]
  const toolbar = (
    <div className="grid items-end gap-4 sm:grid-cols-[minmax(0,1fr)_minmax(180px,240px)]">
      <TextInput
        label="Cari pengumuman"
        hideLabel
        placeholder="Cari judul pengumuman"
        type="search"
        value={filters.search}
        maxLength={200}
        onChange={(e) => change('search', e.target.value)}
      />
      {manage ? (
        <div>
          <label className="sr-only" htmlFor="announcement-status">
            Status pengumuman
          </label>
          <select
            id="announcement-status"
            value={filters.status}
            onChange={(e) => change('status', e.target.value)}
            className="min-h-12 w-full rounded-control border border-control-border bg-surface px-3 py-2.5 text-base text-ink"
          >
            <option value="all">Semua status</option>
            {Object.entries(announcementStatuses).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </div>
      ) : null}
      {filters.search || filters.status !== 'all' ? (
        <button
          type="button"
          onClick={() => navigate(base, { replace: true })}
          className="min-h-11 justify-self-start text-sm font-bold text-action hover:underline"
        >
          Reset filter
        </button>
      ) : null}
    </div>
  )
  return (
    <main
      className="@container/page min-w-0 flex-1 p-6 max-sm:px-4"
      aria-labelledby="announcements-page-title"
    >
      <div className="mx-auto flex w-full max-w-[96rem] min-w-0 flex-col gap-6">
        <header className="flex flex-wrap items-center justify-between gap-4">
          <PageIntro
            id="announcements-page-title"
            title="Pengumuman"
            description={
              manage
                ? 'Kelola informasi dan jadwal tayang untuk seluruh warga RT.'
                : 'Informasi dan kegiatan terbaru di lingkungan RT.'
            }
          />
          {manage ? (
            <Link
              to={{ pathname: `${base}/tambah`, search: location.search }}
              className="inline-flex min-h-12 items-center justify-center gap-2 rounded-control border border-transparent bg-action px-5 py-3 text-sm font-bold text-white hover:bg-action-hover forced-colors:border-[ButtonText]"
            >
              <Plus size={20} aria-hidden="true" />
              Buat Pengumuman
            </Link>
          ) : null}
        </header>
        {isManager(profile?.role) ? (
          <Link
            to={manage ? '/warga/pengumuman' : '/admin/pengumuman'}
            className="inline-flex min-h-11 items-center self-start text-sm font-bold text-action hover:underline"
          >
            {manage ? 'Lihat tampilan pembaca' : 'Kelola pengumuman'}
          </Link>
        ) : null}
        {manage ? (
          <TablePagination
            caption="Daftar pengumuman"
            toolbar={toolbar}
            columns={columns}
            items={query.items}
            getRowKey={(a) => a.id}
            pagination={{
              page: filters.page,
              pageSize: 4,
              total,
              itemLabel: 'pengumuman',
              label: 'Halaman pengumuman',
              onPageChange: (page) => change('page', String(page)),
            }}
            isLoading={query.isPending}
            isFetching={query.isFetching}
            error={query.isError ? announcementError(query.error) : null}
            onRetry={() => void query.refetch()}
            loadingMessage="Memuat pengumuman…"
            emptyState={{
              description:
                'Belum ada pengumuman atau tidak ada hasil yang sesuai filter.',
            }}
          />
        ) : (
          <section
            className="flex min-w-0 flex-col gap-5"
            aria-label="Daftar pengumuman aktif"
            aria-busy={query.isFetching}
          >
            {toolbar}
            <AnnouncementState
              loading={query.isPending}
              error={query.error}
              empty={!query.items.length}
              fetching={query.isFetching}
              onRetry={() => void query.refetch()}
            />
            {!query.isPending && !query.isError ? (
              <>
                <h2 className="sr-only">Daftar pengumuman</h2>
                <AnnouncementCards
                  items={query.items}
                  search={location.search}
                />
                <nav
                  className="flex flex-wrap items-center justify-between gap-4 text-sm text-muted"
                  aria-label="Halaman pengumuman"
                >
                  <p>
                    {total} pengumuman · Halaman {filters.page} dari {pageCount}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      className="inline-flex min-h-11 items-center gap-2 rounded-control border border-border bg-surface px-3 text-ink disabled:cursor-default disabled:opacity-50"
                      disabled={filters.page <= 1}
                      onClick={() => change('page', String(filters.page - 1))}
                    >
                      <ChevronLeft size={18} aria-hidden="true" />
                      Sebelumnya
                    </button>
                    <button
                      type="button"
                      className="inline-flex min-h-11 items-center gap-2 rounded-control border border-border bg-surface px-3 text-ink disabled:cursor-default disabled:opacity-50"
                      disabled={filters.page >= pageCount}
                      onClick={() => change('page', String(filters.page + 1))}
                    >
                      Berikutnya
                      <ChevronRight size={18} aria-hidden="true" />
                    </button>
                  </div>
                </nav>
              </>
            ) : null}
          </section>
        )}
      </div>
      <Outlet context={{ now: query.now }} />
    </main>
  )
}
