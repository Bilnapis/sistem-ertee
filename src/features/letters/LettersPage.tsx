import { selectControl } from '../../components/ui'
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
import styles from './styles'

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
    <main className={styles.page} aria-labelledby="letters-page-title">
      <div className={styles.pageContent}>
        <header className={styles.pageHeader}>
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
              <Link className={styles.secondary} to="/admin/pengajuan-surat">
                <ArrowLeft size={18} aria-hidden="true" />
                Semua pengajuan
              </Link>
            ) : (
              <Link className={styles.secondary} to="/warga/pengajuan-surat">
                Pengajuan saya
                <ArrowRight size={18} aria-hidden="true" />
              </Link>
            )
          ) : (
            <Link
              className={styles.primary}
              to={{ pathname: `${base}/tambah`, search: location.search }}
            >
              <Plus size={20} aria-hidden="true" />
              Ajukan Surat
            </Link>
          )}
        </header>
        {!manage && isManager(profile?.role) ? (
          <Link className={styles.textLink} to="/admin/pengajuan-surat">
            Kelola seluruh pengajuan warga{' '}
            <ArrowRight size={16} aria-hidden="true" />
          </Link>
        ) : null}
        {blocked ? (
          <div className={styles.eligibility}>
            <p>{blocked}</p>
            <Link className={styles.textLink} to="/warga/profil">
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
              <div className={styles.feedback}>
                <Feedback>{letterError(summary.error)}</Feedback>
                <button
                  type="button"
                  className={styles.textLink}
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
          className={styles.list}
          aria-label={
            manage ? 'Daftar pengajuan warga' : 'Daftar pengajuan saya'
          }
        >
          <div className={styles.filters}>
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
            <div className={styles.field}>
              <label htmlFor="letter-status-filter">Status</label>
              <select
                className={selectControl}
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
              <div className={styles.field}>
                <label htmlFor="letter-type-filter">Jenis surat</label>
                <select
                  className={selectControl}
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
            <div className={styles.field}>
              <label htmlFor="letter-sort-filter">Urutan</label>
              <select
                className={selectControl}
                id="letter-sort-filter"
                value={filters.sort}
                onChange={(event) => change('sort', event.target.value)}
              >
                <option value="newest">Terbaru</option>
                <option value="oldest">Terlama</option>
              </select>
            </div>
          </div>
          <div aria-live="polite" className={styles.srOnly}>
            {directory.isFetching
              ? 'Memuat pengajuan'
              : `${total} pengajuan ditemukan`}
          </div>
          {directory.isPending ? (
            <p className={styles.empty} role="status">
              Memuat pengajuan surat…
            </p>
          ) : directory.isError ? (
            <div className={styles.blocked}>
              <Feedback>{letterError(directory.error)}</Feedback>
              <button
                type="button"
                className={styles.secondary}
                onClick={() => void directory.refetch()}
              >
                Coba lagi pengajuan
              </button>
            </div>
          ) : !directory.data.items.length ? (
            <div className={styles.empty}>
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
              <p className={styles.scrollHint}>
                <MoveHorizontal size={16} aria-hidden="true" />
                Geser tabel untuk melihat seluruh informasi.
              </p>
              <div
                className={styles.tableRegion}
                role="region"
                aria-label="Tabel pengajuan surat, dapat digulir"
                tabIndex={0}
                aria-busy={directory.isFetching}
              >
                <table className={styles.table}>
                  <caption className={styles.srOnly}>
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
                            className={styles.viewLink}
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
              <footer className={styles.pagination}>
                <p>
                  Menampilkan {(filters.page - 1) * 4 + 1}–
                  {Math.min(filters.page * 4, total)} dari {total} pengajuan
                </p>
                <nav aria-label="Halaman pengajuan surat">
                  <button
                    type="button"
                    className={styles.pageButton}
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
                    className={styles.pageButton}
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
