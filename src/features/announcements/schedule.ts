import type { Announcement, AnnouncementStatus } from './types'

export function announcementStatus(
  announcement: Announcement,
  now: number,
): AnnouncementStatus {
  if (announcement.archived_at) return 'archived'
  if (now < Date.parse(announcement.starts_at)) return 'scheduled'
  if (now >= Date.parse(announcement.ends_at)) return 'ended'
  return 'active'
}

// datetime-local values always represent WIB, regardless of the browser timezone.
export function fromWibInput(value: string): string | null {
  if (!/^(?!0000)\d{4}-\d{2}-\d{2}T\d{2}:\d{2}(?::\d{2})?$/.test(value))
    return null
  const date = new Date(`${value}+07:00`)
  if (!Number.isFinite(date.getTime())) return null
  const normalized = new Date(date.getTime() + 7 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 19)
  if (normalized !== (value.length === 16 ? `${value}:00` : value)) return null
  return date.toISOString()
}

export function toWibInput(value: string): string {
  return new Date(Date.parse(value) + 7 * 60 * 60 * 1000)
    .toISOString()
    .slice(0, 19)
}
