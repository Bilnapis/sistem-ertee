import { cn } from '../../lib/cn'

import {
  ArrowRight,
  ChevronLeft,
  ChevronRight,
  MoveHorizontal,
  Plus,
  Search,
  UsersRound,
} from 'lucide-react'
import { Link, Outlet, useLocation, useSearchParams } from 'react-router'
import { Feedback } from '../../components/Feedback'
import { PageIntro } from '../../components/PageIntro'
import { SummaryCardView } from '../../components/SummaryCardView'
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
  const pageCount = Math.max(1, Math.ceil(total / 10))
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
        <header className="flex flex-wrap items-center justify-between gap-4 [&>a]:min-h-11 [&>a]:flex-[0_1_auto] [&>a]:px-4 [&>a]:py-2.5 @max-[33rem]/page:[&>a]:basis-full [&>a>span]:min-w-0 [&>a>span]:wrap-anywhere [&>div]:min-w-0 [&>div]:flex-[1_1_18rem]">
          <PageIntro
            id="resident-page-title"
            title="Data Warga"
            description="Kelola data warga RT 04"
          />
          <Link
            className="inline-flex min-h-12 max-w-full shrink-0 items-center justify-center gap-2 rounded-control border border-transparent bg-action px-5 py-3 text-center text-sm leading-5 font-bold wrap-anywhere text-white enabled:cursor-pointer enabled:hover:bg-action-hover disabled:cursor-wait disabled:opacity-65 motion-safe:transition-colors motion-safe:duration-150 forced-colors:border-[ButtonText] [&>svg]:shrink-0"
            to={linkTo('tambah')}
          >
            <Plus size={18} aria-hidden="true" />
            <span>Tambah warga</span>
          </Link>
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
            <button
              type="button"
              className="inline-flex min-h-12 max-w-full shrink-0 items-center justify-center gap-2 rounded-control border border-border bg-surface px-5 py-3 text-center text-sm leading-5 font-bold wrap-anywhere text-slate-700 enabled:cursor-pointer enabled:hover:bg-page disabled:cursor-wait disabled:opacity-65 motion-safe:transition-colors motion-safe:duration-150 [&>svg]:shrink-0"
              onClick={() => void summary.refetch()}
            >
              Coba lagi ringkasan
            </button>
          </div>
        ) : null}
        <section
          className="flex min-w-0 flex-col gap-3"
          aria-label="Daftar warga"
        >
          <div className="grid grid-cols-[minmax(16rem,1fr)_repeat(3,minmax(9rem,10.5rem))] items-end gap-3 @max-[48.25rem]/page:grid-cols-3 @max-[33rem]/page:grid-cols-2">
            <div className="grid min-w-0 gap-1.5 @max-[48.25rem]/page:col-span-full">
              <label
                className="text-sm leading-5 font-semibold wrap-anywhere text-slate-700"
                htmlFor="resident-search"
              >
                Cari warga
              </label>
              <div className="flex min-w-0 items-center gap-2 rounded-control border border-control-border bg-surface px-3 text-muted focus-within:border-action focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-action [&>input]:min-h-[46px] [&>input]:w-full [&>input]:min-w-0 [&>input]:border-0 [&>input]:bg-transparent [&>input]:py-2 [&>input]:text-base [&>input]:leading-6 [&>input]:text-ink [&>input]:outline-offset-[-3px] [&>input]:placeholder:text-muted [&>svg]:shrink-0">
                <Search size={18} aria-hidden="true" />
                <input
                  id="resident-search"
                  type="search"
                  maxLength={200}
                  value={filters.search}
                  onChange={(event) => change('search', event.target.value)}
                  placeholder="Nama, NIK, atau rumah"
                />
              </div>
            </div>
            <label className="grid min-w-0 gap-1.5">
              <span className="text-sm leading-5 font-semibold wrap-anywhere text-slate-700">
                Status akun
              </span>
              <select
                className="min-h-12 w-full min-w-0 rounded-control border border-control-border bg-surface px-3 py-2.5 pe-8 text-start font-sans text-base leading-6 text-ellipsis text-ink placeholder:text-muted hover:border-slate-600 focus-visible:border-action focus-visible:outline-action disabled:cursor-not-allowed disabled:border-border disabled:bg-soft disabled:text-muted disabled:opacity-100 aria-invalid:border-danger aria-invalid:focus-visible:outline-danger [&[readonly]]:bg-page"
                aria-label="Status akun"
                value={filters.status}
                onChange={(event) => change('status', event.target.value)}
              >
                <option value="all">Semua</option>
                <option value="active">Aktif</option>
                <option value="inactive">Tidak Aktif</option>
                <option value="archived">Diarsipkan</option>
              </select>
            </label>
            <label className="grid min-w-0 gap-1.5">
              <span className="text-sm leading-5 font-semibold wrap-anywhere text-slate-700">
                Role warga
              </span>
              <select
                className="min-h-12 w-full min-w-0 rounded-control border border-control-border bg-surface px-3 py-2.5 pe-8 text-start font-sans text-base leading-6 text-ellipsis text-ink placeholder:text-muted hover:border-slate-600 focus-visible:border-action focus-visible:outline-action disabled:cursor-not-allowed disabled:border-border disabled:bg-soft disabled:text-muted disabled:opacity-100 aria-invalid:border-danger aria-invalid:focus-visible:outline-danger [&[readonly]]:bg-page"
                aria-label="Role warga"
                value={filters.role}
                onChange={(event) => change('role', event.target.value)}
              >
                <option value="all">Semua</option>
                {Object.entries(roleLabels).map(([key, label]) => (
                  <option value={key} key={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="grid min-w-0 gap-1.5 @max-[33rem]/page:col-span-full">
              <span className="text-sm leading-5 font-semibold wrap-anywhere text-slate-700">
                Urutkan warga
              </span>
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
          {directory.isError ? (
            <div className="flex flex-col items-center gap-4 px-5 py-10 text-center text-muted [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-ink">
              <Feedback>{residentError(directory.error)}</Feedback>
              <button
                type="button"
                className="inline-flex min-h-12 max-w-full shrink-0 items-center justify-center gap-2 rounded-control border border-border bg-surface px-5 py-3 text-center text-sm leading-5 font-bold wrap-anywhere text-slate-700 enabled:cursor-pointer enabled:hover:bg-page disabled:cursor-wait disabled:opacity-65 motion-safe:transition-colors motion-safe:duration-150 [&>svg]:shrink-0"
                onClick={() => void directory.refetch()}
              >
                Coba lagi
              </button>
            </div>
          ) : directory.isPending ? (
            <p
              className="flex flex-col items-center gap-4 px-5 py-10 text-center text-muted [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-ink"
              role="status"
            >
              Memuat data warga…
            </p>
          ) : !directory.data?.items.length ? (
            <div className="flex flex-col items-center gap-4 px-5 py-10 text-center text-muted [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-ink">
              <UsersRound size={32} aria-hidden="true" />
              <h2>Belum ada warga yang ditampilkan</h2>
              <p>
                {filters.search ||
                filters.status !== 'all' ||
                filters.role !== 'all'
                  ? 'Coba ubah kata pencarian atau filter.'
                  : 'Tambahkan warga untuk memulai pendataan.'}
              </p>
              {filters.page > 1 ? (
                <button
                  type="button"
                  className="inline-flex min-h-12 max-w-full shrink-0 items-center justify-center gap-2 rounded-control border border-border bg-surface px-5 py-3 text-center text-sm leading-5 font-bold wrap-anywhere text-slate-700 enabled:cursor-pointer enabled:hover:bg-page disabled:cursor-wait disabled:opacity-65 motion-safe:transition-colors motion-safe:duration-150 [&>svg]:shrink-0"
                  onClick={() => change('page', '1')}
                >
                  Ke halaman pertama
                </button>
              ) : null}
            </div>
          ) : (
            <div className="grid min-w-0 gap-2">
              <p
                className="hidden items-center gap-2 text-xs leading-normal text-muted @max-[47.125rem]/page:flex [&>span]:min-w-0 [&>span]:wrap-anywhere [&>svg]:shrink-0"
                id="resident-table-hint"
              >
                <MoveHorizontal size={16} aria-hidden="true" />
                <span>Geser tabel untuk melihat kolom lainnya</span>
              </p>
              <div
                className="overflow-auto overscroll-x-contain rounded-lg border border-border bg-surface"
                role="region"
                aria-label="Tabel warga, geser untuk melihat seluruh kolom"
                aria-describedby="resident-table-hint"
                tabIndex={0}
                aria-busy={directory.isFetching}
              >
                <table className="w-full min-w-[44rem] table-fixed border-collapse text-sm leading-normal [&_tbody_th]:font-semibold [&_tbody_tr]:border-t [&_tbody_tr]:border-border [&_td]:px-4 [&_td]:py-3 [&_td]:text-start [&_td]:align-middle [&_td]:wrap-anywhere [&_td:last-child]:text-end [&_th]:px-4 [&_th]:py-3 [&_th]:text-start [&_th]:align-middle [&_th]:wrap-anywhere [&_th:last-child]:text-end [&_thead]:bg-soft [&_thead]:text-xs [&_thead]:tracking-wider [&_thead]:text-slate-600 [&_thead]:uppercase [&_thead_th]:font-bold">
                  <caption className="sr-only">
                    Data warga beserta role dan status akun
                  </caption>
                  <colgroup>
                    <col className="w-[29%]" />
                    <col className="w-[23%]" />
                    <col className="w-[18%]" />
                    <col className="w-[18%]" />
                    <col className="w-[12%]" />
                  </colgroup>
                  <thead>
                    <tr>
                      <th scope="col">Warga</th>
                      <th scope="col">NIK</th>
                      <th scope="col">Jenis kelamin</th>
                      <th scope="col">Status</th>
                      <th scope="col">Aksi</th>
                    </tr>
                  </thead>
                  <tbody>
                    {directory.data.items.map((profile) => (
                      <tr key={profile.id}>
                        <th scope="row">
                          <span className="block wrap-anywhere">
                            <bdi>{profile.full_name}</bdi>
                          </span>
                          <span className="mt-1 inline-block max-w-full rounded-md bg-soft px-2 py-0.5 text-xs leading-normal font-semibold wrap-anywhere text-slate-600 forced-colors:border forced-colors:border-current">
                            {roleLabels[profile.role]}
                          </span>
                        </th>
                        <td className="whitespace-nowrap text-muted tabular-nums">
                          <bdi dir="ltr">{maskIdentity(profile.nik)}</bdi>
                        </td>
                        <td>
                          {profile.gender
                            ? genderLabels[profile.gender]
                            : 'Belum diisi'}
                        </td>
                        <td>
                          <span
                            className={cn(
                              'inline-flex w-fit max-w-full items-center rounded-full px-3 py-1 text-xs leading-normal font-semibold wrap-anywhere whitespace-normal forced-colors:border forced-colors:border-[CanvasText]',
                              profile.is_active && !profile.archived_at
                                ? 'bg-success-soft text-success'
                                : 'bg-soft text-slate-600',
                            )}
                          >
                            {profile.archived_at
                              ? 'Diarsipkan'
                              : profile.is_active
                                ? 'Aktif'
                                : 'Tidak Aktif'}
                          </span>
                        </td>
                        <td>
                          <Link
                            to={linkTo(profile.id)}
                            className="inline-flex min-h-11 max-w-full items-center justify-end gap-2 border-0 bg-transparent p-0 text-start text-sm leading-5 font-semibold wrap-anywhere text-action hover:underline disabled:cursor-wait disabled:opacity-65 [&>span]:min-w-0 [&>span]:wrap-anywhere [&>svg]:shrink-0 rtl:[&>svg]:-scale-x-100"
                            aria-label={`Lihat ${profile.full_name}`}
                          >
                            <span>Lihat</span>
                            <ArrowRight size={16} aria-hidden="true" />
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          {!directory.isPending && !directory.isError ? (
            <footer className="flex flex-wrap items-center justify-between gap-x-4 gap-y-3 py-1 text-sm leading-normal text-muted [&>nav]:ms-auto [&>nav]:flex [&>nav]:max-w-full [&>nav]:flex-wrap [&>nav]:items-center [&>nav]:justify-end [&>nav]:gap-2 [&>nav]:text-ink [&>nav]:tabular-nums [&>p]:min-w-0 [&>p]:flex-[1_1_15rem] [&>p]:wrap-anywhere">
              <p aria-live="polite">
                Menampilkan {total ? (filters.page - 1) * 10 + 1 : 0}–
                {Math.min(filters.page * 10, total)} dari{' '}
                {total.toLocaleString('id-ID')} warga
              </p>
              <nav aria-label="Halaman warga">
                <button
                  type="button"
                  className="inline-flex size-11 shrink-0 items-center justify-center rounded-control border border-border bg-surface p-2 text-muted enabled:hover:bg-soft disabled:cursor-default disabled:opacity-40 rtl:[&>svg]:-scale-x-100"
                  disabled={filters.page <= 1}
                  aria-label="Halaman sebelumnya"
                  onClick={() => change('page', String(filters.page - 1))}
                >
                  <ChevronLeft size={18} />
                </button>
                <span
                  className="min-w-0 px-1 wrap-anywhere"
                  aria-current="page"
                >
                  <bdi>
                    {filters.page} / {pageCount}
                  </bdi>
                </span>
                <button
                  type="button"
                  className="inline-flex size-11 shrink-0 items-center justify-center rounded-control border border-border bg-surface p-2 text-muted enabled:hover:bg-soft disabled:cursor-default disabled:opacity-40 rtl:[&>svg]:-scale-x-100"
                  disabled={filters.page >= pageCount}
                  aria-label="Halaman berikutnya"
                  onClick={() => change('page', String(filters.page + 1))}
                >
                  <ChevronRight size={18} />
                </button>
              </nav>
            </footer>
          ) : null}
        </section>
      </div>
      <Outlet />
    </main>
  )
}
