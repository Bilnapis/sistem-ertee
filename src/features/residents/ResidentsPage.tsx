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
import styles from './Residents.module.css'

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
    <main className={styles.page} aria-labelledby="resident-page-title">
      <div className={styles.pageContent}>
        <header className={styles.pageHeader}>
          <div className={styles.pageIntro}>
            <h1 id="resident-page-title">Data Warga</h1>
            <p>Kelola data warga RT 04</p>
          </div>
          <Link className={styles.primary} to={linkTo('tambah')}>
            <Plus size={18} aria-hidden="true" />
            <span>Tambah warga</span>
          </Link>
        </header>
        <section aria-label="Ringkasan pendataan">
          <dl className={styles.summaries}>
            {(
              [
                'total',
                'menunggu_verifikasi',
                'terverifikasi',
                'perlu_perbaikan',
              ] as const
            ).map((key) => (
              <div key={key} className={styles.summary}>
                <dt>{key === 'total' ? 'Total warga' : statusLabels[key]}</dt>
                <dd>
                  <bdi>
                    {summary.isError
                      ? '—'
                      : (summary.data?.[key]?.toLocaleString('id-ID') ?? '…')}
                  </bdi>
                </dd>
              </div>
            ))}
          </dl>
        </section>
        {summary.isError ? (
          <div className={styles.retry}>
            <Feedback>Ringkasan belum dapat dimuat.</Feedback>
            <button
              type="button"
              className={styles.secondary}
              onClick={() => void summary.refetch()}
            >
              Coba lagi ringkasan
            </button>
          </div>
        ) : null}
        <section className={styles.directory} aria-label="Daftar warga">
          <div className={styles.filters}>
            <div className={styles.searchField}>
              <label className={styles.filterTitle} htmlFor="resident-search">
                Cari warga
              </label>
              <div className={styles.search}>
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
            <label className={styles.filterLabel}>
              <span className={styles.filterTitle}>Status akun</span>
              <select
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
            <label className={styles.filterLabel}>
              <span className={styles.filterTitle}>Role warga</span>
              <select
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
            <label className={`${styles.filterLabel} ${styles.sortField}`}>
              <span className={styles.filterTitle}>Urutkan warga</span>
              <select
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
            <div className={styles.empty}>
              <Feedback>{residentError(directory.error)}</Feedback>
              <button
                type="button"
                className={styles.secondary}
                onClick={() => void directory.refetch()}
              >
                Coba lagi
              </button>
            </div>
          ) : directory.isPending ? (
            <p className={styles.empty} role="status">
              Memuat data warga…
            </p>
          ) : !directory.data?.items.length ? (
            <div className={styles.empty}>
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
                  className={styles.secondary}
                  onClick={() => change('page', '1')}
                >
                  Ke halaman pertama
                </button>
              ) : null}
            </div>
          ) : (
            <div className={styles.tableBlock}>
              <p className={styles.tableHint} id="resident-table-hint">
                <MoveHorizontal size={16} aria-hidden="true" />
                <span>Geser tabel untuk melihat kolom lainnya</span>
              </p>
              <div
                className={styles.tableScroll}
                role="region"
                aria-label="Tabel warga, geser untuk melihat seluruh kolom"
                aria-describedby="resident-table-hint"
                tabIndex={0}
                aria-busy={directory.isFetching}
              >
                <table className={styles.table}>
                  <caption className={styles.srOnly}>
                    Data warga beserta role dan status akun
                  </caption>
                  <colgroup>
                    <col className={styles.nameColumn} />
                    <col className={styles.identityColumn} />
                    <col className={styles.genderColumn} />
                    <col className={styles.statusColumn} />
                    <col className={styles.actionColumn} />
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
                          <span className={styles.residentName}>
                            <bdi>{profile.full_name}</bdi>
                          </span>
                          <span className={styles.roleBadge}>
                            {roleLabels[profile.role]}
                          </span>
                        </th>
                        <td className={styles.identity}>
                          <bdi dir="ltr">{maskIdentity(profile.nik)}</bdi>
                        </td>
                        <td>
                          {profile.gender
                            ? genderLabels[profile.gender]
                            : 'Belum diisi'}
                        </td>
                        <td>
                          <span
                            className={`${styles.badge} ${profile.is_active && !profile.archived_at ? styles.activeBadge : styles.mutedBadge}`}
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
                            className={styles.viewLink}
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
            <footer className={styles.pagination}>
              <p aria-live="polite">
                Menampilkan {total ? (filters.page - 1) * 10 + 1 : 0}–
                {Math.min(filters.page * 10, total)} dari{' '}
                {total.toLocaleString('id-ID')} warga
              </p>
              <nav aria-label="Halaman warga">
                <button
                  type="button"
                  className={styles.pageButton}
                  disabled={filters.page <= 1}
                  aria-label="Halaman sebelumnya"
                  onClick={() => change('page', String(filters.page - 1))}
                >
                  <ChevronLeft size={18} />
                </button>
                <span className={styles.pageIndicator} aria-current="page">
                  <bdi>
                    {filters.page} / {pageCount}
                  </bdi>
                </span>
                <button
                  type="button"
                  className={styles.pageButton}
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
