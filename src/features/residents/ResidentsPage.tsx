import { Plus, Search, UsersRound } from 'lucide-react'
import { Outlet, useLocation, useSearchParams } from 'react-router'
import { ButtonLink, Button } from '../../components/Button'
import { Feedback } from '../../components/Feedback'
import { PageIntro } from '../../components/PageIntro'
import { SummaryCardView } from '../../components/SummaryCardView'
import {
  TableActionLink,
  TableBadge,
  TableCellText,
  TablePagination,
} from '../../components/TablePagination'
import type { ResidentFilters, ResidentRole } from '../../lib/database.types'
import {
  genderLabels,
  maskIdentity,
  residentError,
  roleLabels,
  statusLabels,
  useDirectory,
  useResidentSummary,
} from './data'

const roles = ['ketua_rt', 'pengurus_rt', 'warga']
const statuses = ['all', 'active', 'inactive', 'archived']
export default function ResidentsPage() {
  const [params, setParams] = useSearchParams()
  const location = useLocation()
  const filters: ResidentFilters = {
    search: (params.get('search') ?? '').slice(0, 200),
    status: statuses.includes(params.get('status') ?? '')
      ? (params.get('status') as ResidentFilters['status'])
      : 'all',
    role: roles.includes(params.get('role') ?? '')
      ? (params.get('role') as ResidentRole)
      : 'all',
    verification: 'all',
    sort: params.get('sort') === 'name' ? 'name' : 'newest',
    page: Math.min(1000000, Math.max(1, Number(params.get('page')) || 1)) | 0,
  }
  const directory = useDirectory(filters)
  const summary = useResidentSummary()
  const change = (key: string, value: string) =>
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous)
        next.delete('verification')
        if (
          value === 'all' ||
          value === '' ||
          (key === 'page' && value === '1')
        )
          next.delete(key)
        else next.set(key, value)
        if (key !== 'page') next.delete('page')
        return next
      },
      { replace: true },
    )
  const total = directory.data?.total ?? 0
  const linkTo = (path: string) => ({
    pathname: `/admin/warga/${path}`,
    search: location.search,
  })

  return (
    <main
      className="@container/page w-full min-w-0 flex-1 text-sm leading-normal"
      aria-labelledby="resident-page-title"
    >
      <div className="mx-auto flex w-full max-w-[96rem] min-w-0 flex-col gap-6 px-6 pt-6 pb-8 @max-[33rem]/page:px-4 @max-[33rem]/page:pb-6">
        <header className="flex flex-wrap items-center justify-between gap-4 [&>div]:min-w-0 [&>div]:flex-[1_1_18rem]">
          <PageIntro
            id="resident-page-title"
            title="Data Warga"
            description="Kelola data warga RT 04"
          />
          <ButtonLink
            to={linkTo('tambah')}
            variant="solid"
            leadingIcon={<Plus size={18} aria-hidden="true" />}
            size="compact"
            width="responsive"
          >
            Tambah warga
          </ButtonLink>
        </header>
        <section aria-label="Ringkasan pendataan">
          <SummaryCardView
            aria-busy={summary.isPending}
            items={(
              [
                'total',
                'menunggu_verifikasi',
                'terverifikasi',
                'perlu_perbaikan',
              ] as const
            ).map((key) => ({
              id: key,
              label: key === 'total' ? 'Total warga' : statusLabels[key],
              value: summary.isError ? '—' : (summary.data?.[key] ?? '…'),
            }))}
          />
        </section>
        {summary.isError ? (
          <div className="flex flex-wrap gap-3">
            <Feedback>Ringkasan belum dapat dimuat.</Feedback>
            <Button
              type="button"
              onClick={() => void summary.refetch()}
              variant="outline"
            >
              Coba lagi ringkasan
            </Button>
          </div>
        ) : null}
        <section className="min-w-0" aria-label="Daftar warga">
          <TablePagination
            toolbar={
              <div className="grid grid-cols-[minmax(16rem,1fr)_repeat(3,minmax(9rem,10.5rem))] items-center gap-3 @max-[48rem]/table-pagination:grid-cols-3 @max-[33rem]/table-pagination:grid-cols-1">
                <div className="min-w-0 @max-[48rem]/table-pagination:col-span-full">
                  <label className="sr-only" htmlFor="resident-search">
                    Cari warga
                  </label>
                  <div className="flex min-w-0 items-center gap-2 rounded-control border border-control-border bg-surface px-3 text-muted focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-action [&>input]:min-h-[46px] [&>input]:w-full [&>input]:min-w-0 [&>input]:border-0 [&>input]:bg-transparent [&>input]:py-2 [&>input]:text-base [&>input]:leading-6 [&>input]:text-ink [&>input]:placeholder:text-muted [&>svg]:shrink-0">
                    <Search size={18} aria-hidden="true" />
                    <input
                      id="resident-search"
                      type="search"
                      className="focus-visible:outline-none"
                      maxLength={200}
                      value={filters.search}
                      onChange={(event) => change('search', event.target.value)}
                      placeholder="Cari nama, NIK, atau rumah"
                    />
                  </div>
                </div>
                <label className="min-w-0">
                  <span className="sr-only">Status akun</span>
                  <select
                    className="min-h-12 w-full min-w-0 rounded-control border border-control-border bg-surface px-3 py-2.5 pe-8 text-start font-sans text-base leading-6 text-ellipsis text-ink placeholder:text-muted hover:border-slate-600 focus-visible:border-action focus-visible:outline-action disabled:cursor-not-allowed disabled:border-border disabled:bg-soft disabled:text-muted disabled:opacity-100 aria-invalid:border-danger aria-invalid:focus-visible:outline-danger [&[readonly]]:bg-page"
                    aria-label="Status akun"
                    value={filters.status}
                    onChange={(event) => change('status', event.target.value)}
                  >
                    <option value="all">Semua status</option>
                    <option value="active">Aktif</option>
                    <option value="inactive">Tidak Aktif</option>
                    <option value="archived">Diarsipkan</option>
                  </select>
                </label>
                <label className="min-w-0">
                  <span className="sr-only">Role warga</span>
                  <select
                    className="min-h-12 w-full min-w-0 rounded-control border border-control-border bg-surface px-3 py-2.5 pe-8 text-start font-sans text-base leading-6 text-ellipsis text-ink placeholder:text-muted hover:border-slate-600 focus-visible:border-action focus-visible:outline-action disabled:cursor-not-allowed disabled:border-border disabled:bg-soft disabled:text-muted disabled:opacity-100 aria-invalid:border-danger aria-invalid:focus-visible:outline-danger [&[readonly]]:bg-page"
                    aria-label="Role warga"
                    value={filters.role}
                    onChange={(event) => change('role', event.target.value)}
                  >
                    <option value="all">Semua role</option>
                    {Object.entries(roleLabels).map(([key, label]) => (
                      <option value={key} key={key}>
                        {label}
                      </option>
                    ))}
                  </select>
                </label>
                <label className="min-w-0">
                  <span className="sr-only">Urutkan warga</span>
                  <select
                    className="min-h-12 w-full min-w-0 rounded-control border border-control-border bg-surface px-3 py-2.5 pe-8 text-start font-sans text-base leading-6 text-ellipsis text-ink placeholder:text-muted hover:border-slate-600 focus-visible:border-action focus-visible:outline-action disabled:cursor-not-allowed disabled:border-border disabled:bg-soft disabled:text-muted disabled:opacity-100 aria-invalid:border-danger aria-invalid:focus-visible:outline-danger [&[readonly]]:bg-page"
                    aria-label="Urutkan warga"
                    value={filters.sort}
                    onChange={(event) => change('sort', event.target.value)}
                  >
                    <option value="newest">Terbaru</option>
                    <option value="name">Nama A–Z</option>
                  </select>
                </label>
              </div>
            }
            caption="Data warga beserta role dan status akun"
            items={directory.data?.items ?? []}
            getRowKey={(profile) => profile.id}
            columns={[
              {
                id: 'resident',
                header: 'Warga',
                width: 29,
                rowHeader: true,
                render: (profile) => (
                  <TableCellText tag={roleLabels[profile.role]}>
                    {profile.full_name}
                  </TableCellText>
                ),
              },
              {
                id: 'nik',
                header: 'NIK',
                width: 23,
                kind: 'identity',
                render: (profile) => (
                  <bdi dir="ltr">{maskIdentity(profile.nik)}</bdi>
                ),
              },
              {
                id: 'gender',
                header: 'Jenis kelamin',
                width: 18,
                render: (profile) =>
                  profile.gender ? genderLabels[profile.gender] : 'Belum diisi',
              },
              {
                id: 'status',
                header: 'Status',
                width: 18,
                render: (profile) => (
                  <TableBadge
                    tone={
                      profile.is_active && !profile.archived_at
                        ? 'success'
                        : 'neutral'
                    }
                  >
                    {profile.archived_at
                      ? 'Diarsipkan'
                      : profile.is_active
                        ? 'Aktif'
                        : 'Tidak Aktif'}
                  </TableBadge>
                ),
              },
              {
                id: 'action',
                header: 'Aksi',
                width: 12,
                render: (profile) => (
                  <TableActionLink
                    to={linkTo(profile.id)}
                    aria-label={`Lihat ${profile.full_name}`}
                  >
                    Lihat
                  </TableActionLink>
                ),
              },
            ]}
            pagination={{
              page: filters.page,
              pageSize: 10,
              total,
              itemLabel: 'warga',
              label: 'Halaman warga',
              onPageChange: (page) => change('page', String(page)),
            }}
            isFetching={directory.isFetching}
            isLoading={directory.isPending}
            loadingMessage="Memuat data warga…"
            error={directory.isError ? residentError(directory.error) : null}
            onRetry={() => void directory.refetch()}
            emptyState={{
              icon: UsersRound,
              title: 'Belum ada warga yang ditampilkan',
              description:
                filters.search ||
                filters.status !== 'all' ||
                filters.role !== 'all'
                  ? 'Coba ubah kata pencarian atau filter.'
                  : 'Tambahkan warga untuk memulai pendataan.',
              action:
                filters.page > 1
                  ? {
                      label: 'Ke halaman pertama',
                      onClick: () => change('page', '1'),
                    }
                  : undefined,
            }}
          />
        </section>
      </div>
      <Outlet />
    </main>
  )
}
