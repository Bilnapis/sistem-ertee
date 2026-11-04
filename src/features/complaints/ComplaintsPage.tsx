import { useEffect } from 'react'
import { ArrowRight, ClipboardList, Plus, Search } from 'lucide-react'
import {
  Link,
  Outlet,
  useLocation,
  useNavigate,
  useSearchParams,
} from 'react-router'
import { PageIntro } from '../../components/PageIntro'
import { SummaryCardView } from '../../components/SummaryCardView'
import {
  TableActionLink,
  TableCellText,
  TablePagination,
} from '../../components/TablePagination'
import type { TablePaginationColumn } from '../../components/TablePagination'
import { TextInput } from '../../components/TextInput'
import { useAuth } from '../auth/AuthProvider'
import { formatDate, isManager } from '../residents/data'
import { ComplaintSelect } from './ComplaintFields'
import { ComplaintStatusBadge } from './ComplaintStatusBadge'
import {
  complaintCategories,
  complaintError,
  complaintStatuses,
  isComplaintCategory,
  isComplaintStatus,
  useComplaints,
  validDate,
} from './data'
import type { Complaint, ComplaintFilters } from './types'

export default function ComplaintsPage({
  manage = false,
}: {
  manage?: boolean
}) {
  const [params, setParams] = useSearchParams()
  const navigate = useNavigate()
  const location = useLocation()
  const { profile } = useAuth()
  const category = params.get('category') ?? ''
  const status = params.get('status') ?? ''
  const from = params.get('from') ?? ''
  const to = params.get('to') ?? ''
  const filters: ComplaintFilters = {
    search: (params.get('search') ?? '').slice(0, 200),
    category: isComplaintCategory(category) ? category : 'all',
    status: isComplaintStatus(status) ? status : 'all',
    from: validDate(from) ? from : '',
    to: validDate(to) ? to : '',
    sort: params.get('sort') === 'oldest' ? 'oldest' : 'newest',
    page: Math.min(
      1000000,
      Math.max(1, Math.floor(Number(params.get('page')) || 1)),
    ),
  }
  const invalidRange = Boolean(
    filters.from && filters.to && filters.from > filters.to,
  )
  const directory = useComplaints(manage, filters)
  const base = `${manage ? '/admin' : '/warga'}/pengaduan`
  const total = directory.data?.total ?? 0
  const pageCount = Math.max(1, Math.ceil(total / 4))
  const filtered = Boolean(
    filters.search ||
    filters.category !== 'all' ||
    filters.status !== 'all' ||
    filters.from ||
    filters.to,
  )
  const change = (key: string, value: string) => {
    // Browser history updates before React commits navigation. Read the latest
    // URL so quick changes to different controls cannot restore old filters.
    const next = new URLSearchParams(window.location.search)
    if (
      value === '' ||
      value === 'all' ||
      (key === 'page' && value === '1') ||
      (key === 'sort' && value === 'newest')
    )
      next.delete(key)
    else next.set(key, value)
    if (key !== 'page') next.delete('page')
    navigate({ pathname: base, search: next.toString() }, { replace: true })
  }
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
  const columns: TablePaginationColumn<Complaint>[] = [
    {
      id: 'reference',
      header: 'Nomor',
      width: 13,
      rowHeader: true,
      render: (c) => c.reference,
    },
    {
      id: 'title',
      header: 'Judul',
      width: manage ? 20 : 27,
      render: (c) => <TableCellText>{c.title}</TableCellText>,
    },
    ...(manage
      ? [
          {
            id: 'applicant',
            header: 'Nama pengaju',
            width: 16,
            render: (c: Complaint) => (
              <TableCellText secondary={c.identity_snapshot.house_block}>
                {c.identity_snapshot.full_name}
              </TableCellText>
            ),
          },
        ]
      : []),
    {
      id: 'category',
      header: 'Kategori',
      width: manage ? 17 : 22,
      render: (c) => complaintCategories[c.category],
    },
    {
      id: 'date',
      header: 'Tanggal',
      width: manage ? 15 : 18,
      render: (c) => (
        <time dateTime={c.created_at}>{formatDate(c.created_at)}</time>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      width: 12,
      render: (c) => <ComplaintStatusBadge status={c.status} />,
    },
    {
      id: 'action',
      header: 'Aksi',
      width: manage ? 7 : 8,
      render: (c) => (
        <TableActionLink
          to={{ pathname: `${base}/${c.id}`, search: location.search }}
          aria-label={`Lihat pengaduan ${c.reference}`}
        >
          Lihat
        </TableActionLink>
      ),
    },
  ]
  return (
    <main
      className="@container/page min-w-0 flex-1 p-6 max-sm:px-4"
      aria-labelledby="complaints-page-title"
    >
      <div className="mx-auto flex w-full max-w-[96rem] min-w-0 flex-col gap-6">
        <header className="flex items-center justify-between gap-4 @max-[600px]/page:flex-col @max-[600px]/page:items-start">
          <PageIntro
            id="complaints-page-title"
            title="Pengaduan"
            description={
              manage
                ? 'Kelola pengaduan dan tindak lanjut untuk lingkungan RT.'
                : 'Sampaikan pengaduan dan pantau penanganannya di sini.'
            }
          />
          <Link
            to={
              manage
                ? '/warga/pengaduan'
                : { pathname: `${base}/tambah`, search: location.search }
            }
            className="inline-flex min-h-12 max-w-full shrink-0 items-center justify-center gap-2 rounded-control border border-transparent bg-action px-5 py-3 text-center text-sm font-bold wrap-anywhere text-white hover:bg-action-hover forced-colors:border-[ButtonText]"
          >
            {manage ? null : <Plus size={20} aria-hidden="true" />}
            {manage ? 'Pengaduan saya' : 'Buat Pengaduan'}
          </Link>
        </header>
        {!manage && isManager(profile?.role) ? (
          <Link
            className="inline-flex min-h-11 items-center gap-2 text-sm font-bold text-action hover:underline"
            to="/admin/pengaduan"
          >
            Kelola seluruh pengaduan warga{' '}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        ) : null}
        {manage ? (
          <section
            aria-label="Ringkasan pengaduan"
            aria-busy={directory.isFetching}
          >
            <SummaryCardView
              items={Object.entries(complaintStatuses).map(([key, label]) => ({
                id: key,
                label,
                value:
                  directory.data?.summary?.[
                    key as keyof typeof complaintStatuses
                  ] ?? '—',
              }))}
            />
          </section>
        ) : null}
        <section
          className="flex min-w-0 flex-col gap-4"
          aria-label={
            manage ? 'Daftar pengaduan warga' : 'Daftar pengaduan saya'
          }
        >
          <div className="grid grid-cols-3 items-start gap-4 @max-[800px]/page:grid-cols-2 @max-[500px]/page:grid-cols-1">
            <TextInput
              label="Cari pengaduan"
              type="search"
              placeholder={
                manage
                  ? 'Cari judul, nomor, atau nama pengaju'
                  : 'Cari judul atau nomor pengaduan'
              }
              value={filters.search}
              maxLength={200}
              onChange={(e) => change('search', e.target.value)}
              leadingIcon={<Search size={18} />}
            />
            <ComplaintSelect
              label="Kategori"
              value={filters.category}
              onChange={(e) => change('category', e.target.value)}
            >
              <option value="all">Semua kategori</option>
              {Object.entries(complaintCategories).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </ComplaintSelect>
            <ComplaintSelect
              label="Status"
              value={filters.status}
              onChange={(e) => change('status', e.target.value)}
            >
              <option value="all">Semua status</option>
              {Object.entries(complaintStatuses).map(([key, label]) => (
                <option key={key} value={key}>
                  {label}
                </option>
              ))}
            </ComplaintSelect>
            <TextInput
              label="Dari tanggal"
              type="date"
              value={filters.from}
              min="0001-01-01"
              max="9999-12-31"
              onChange={(e) => change('from', e.target.value)}
            />
            <TextInput
              label="Sampai tanggal"
              type="date"
              value={filters.to}
              min={filters.from || '0001-01-01'}
              max="9999-12-31"
              error={
                invalidRange
                  ? 'Tanggal akhir harus sama atau setelah tanggal awal.'
                  : undefined
              }
              onChange={(e) => change('to', e.target.value)}
            />
            <ComplaintSelect
              label="Urutan"
              value={filters.sort}
              onChange={(e) => change('sort', e.target.value)}
            >
              <option value="newest">Terbaru</option>
              <option value="oldest">Terlama</option>
            </ComplaintSelect>
          </div>
          {filtered ? (
            <button
              type="button"
              className="min-h-12 self-start rounded-control border border-border bg-surface px-4 py-3 text-sm font-semibold text-action hover:bg-soft"
              onClick={() => navigate(base, { replace: true })}
            >
              Hapus filter
            </button>
          ) : null}
          <TablePagination
            caption={
              manage ? 'Pengaduan seluruh warga' : 'Pengaduan milik sendiri'
            }
            columns={columns}
            items={directory.data?.items ?? []}
            getRowKey={(c) => c.id}
            pagination={{
              page: filters.page,
              pageSize: 4,
              total,
              itemLabel: 'pengaduan',
              label: 'Halaman pengaduan',
              onPageChange: (page) => change('page', String(page)),
            }}
            isFetching={directory.isFetching}
            isLoading={directory.isPending && !invalidRange}
            loadingMessage="Memuat pengaduan…"
            error={
              invalidRange
                ? 'Periksa rentang tanggal pengajuan.'
                : directory.isError
                  ? complaintError(directory.error)
                  : null
            }
            onRetry={invalidRange ? undefined : () => void directory.refetch()}
            retryLabel="Coba lagi pengaduan"
            emptyState={{
              icon: ClipboardList,
              title: filtered
                ? 'Pengaduan tidak ditemukan'
                : 'Belum ada pengaduan',
              description: filtered
                ? 'Coba ubah atau hapus filter pencarian.'
                : manage
                  ? 'Pengaduan warga akan muncul di sini.'
                  : 'Gunakan tombol Buat Pengaduan untuk menyampaikan pengaduan pertama Anda.',
            }}
          />
        </section>
      </div>
      <Outlet />
    </main>
  )
}
