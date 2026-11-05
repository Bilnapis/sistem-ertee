import { Link } from 'react-router'
import { Megaphone } from 'lucide-react'
import { ButtonLink, Button } from '../../components/Button'
import { cn } from '../../lib/cn'
import { Feedback } from '../../components/Feedback'
import { formatDate } from '../residents/data'
import {
  announcementStatuses,
  announcementError,
  useAnnouncements,
} from './data'
import type { Announcement, AnnouncementStatus } from './types'

export function AnnouncementStatusBadge({
  status,
}: {
  status: AnnouncementStatus
}) {
  return (
    <span
      className={cn(
        'inline-flex rounded-full px-3 py-1 text-xs font-semibold whitespace-nowrap',
        status === 'scheduled' && 'bg-info-soft text-info',
        status === 'active' && 'bg-success-soft text-success',
        status === 'ended' && 'bg-soft text-slate-600',
        status === 'archived' && 'bg-warning-soft text-warning',
      )}
    >
      {announcementStatuses[status]}
    </span>
  )
}

export function AnnouncementPeriod({
  announcement,
}: {
  announcement: Announcement
}) {
  return (
    <dl className="grid gap-2 text-xs leading-relaxed text-muted sm:grid-cols-2">
      <div>
        <dt className="font-semibold">Mulai tayang</dt>
        <dd>
          <time dateTime={announcement.starts_at}>
            {formatDate(announcement.starts_at)}
          </time>
        </dd>
      </div>
      <div>
        <dt className="font-semibold">Selesai tayang</dt>
        <dd>
          <time dateTime={announcement.ends_at}>
            {formatDate(announcement.ends_at)}
          </time>
        </dd>
      </div>
    </dl>
  )
}

export function AnnouncementCards({
  items,
  search = '',
}: {
  items: Announcement[]
  search?: string
}) {
  return (
    <div className="grid min-w-0 gap-4">
      {items.map((item) => (
        <article
          key={item.id}
          className="flex min-w-0 flex-col gap-4 rounded-card border border-border bg-surface p-6 max-sm:p-5"
        >
          <h3 className="text-lg font-bold wrap-anywhere">
            <Link
              className="text-ink hover:text-action hover:underline"
              to={{ pathname: `/warga/pengumuman/${item.id}`, search }}
            >
              {item.title}
            </Link>
          </h3>
          <p className="line-clamp-3 text-sm leading-relaxed wrap-anywhere whitespace-pre-wrap">
            {item.description}
          </p>
          <AnnouncementPeriod announcement={item} />
          <ButtonLink
            aria-label={`Baca selengkapnya: ${item.title}`}
            to={{ pathname: `/warga/pengumuman/${item.id}`, search }}
            variant="ghost"
            size="text"
          >
            Baca selengkapnya
          </ButtonLink>
        </article>
      ))}
    </div>
  )
}

export function AnnouncementState({
  loading,
  error,
  empty,
  fetching,
  onRetry,
}: {
  loading: boolean
  error: unknown
  empty: boolean
  fetching: boolean
  onRetry: () => void
}) {
  if (loading)
    return (
      <p
        role="status"
        className="rounded-card border border-border bg-surface p-6 text-sm text-muted"
      >
        Memuat pengumuman…
      </p>
    )
  if (error)
    return (
      <div className="flex flex-col gap-3 rounded-card border border-border bg-surface p-5">
        <Feedback>{announcementError(error)}</Feedback>
        <Button
          type="button"
          disabled={fetching}
          onClick={onRetry}
          variant="outline"
        >
          Coba lagi
        </Button>
      </div>
    )
  if (empty)
    return (
      <div className="flex flex-col items-center gap-3 rounded-card border border-border bg-surface p-8 text-center text-muted">
        <Megaphone size={28} aria-hidden="true" />
        <p className="text-sm">
          Belum ada pengumuman yang sedang tayang atau sesuai pencarian.
        </p>
      </div>
    )
  return null
}

export function HomeAnnouncements() {
  const query = useAnnouncements(
    'active',
    { search: '', status: 'all', page: 1 },
    3,
  )
  return (
    <section
      className="mb-8 flex flex-col gap-4"
      aria-labelledby="home-announcements-title"
      aria-busy={query.isFetching}
    >
      <header className="flex flex-wrap items-center justify-between gap-3">
        <h2
          id="home-announcements-title"
          className="flex items-center gap-2 text-xl font-bold"
        >
          <Megaphone size={22} className="text-action" aria-hidden="true" />
          Pengumuman
        </h2>
        <ButtonLink to="/warga/pengumuman" variant="ghost" size="text">
          Lihat semua
        </ButtonLink>
      </header>
      <AnnouncementState
        loading={query.isPending}
        error={query.error}
        empty={!query.items.length}
        fetching={query.isFetching}
        onRetry={() => void query.refetch()}
      />
      {!query.isPending && !query.isError ? (
        <AnnouncementCards items={query.items} />
      ) : null}
    </section>
  )
}
