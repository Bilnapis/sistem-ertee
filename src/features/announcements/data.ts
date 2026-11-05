import { useEffect, useReducer } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import { announcementStatus } from './schedule'
import type {
  Announcement,
  AnnouncementClock,
  AnnouncementFilters,
  AnnouncementInput,
  AnnouncementScope,
  AnnouncementStatus,
} from './types'

export const announcementStatuses: Record<AnnouncementStatus, string> = {
  scheduled: 'Terjadwal',
  active: 'Sedang tayang',
  ended: 'Selesai',
  archived: 'Diarsipkan',
}
export const isAnnouncementStatus = (
  value: string,
): value is AnnouncementStatus => Object.hasOwn(announcementStatuses, value)
type ClockSample = AnnouncementClock & { sampledAt: number }

function useScheduleClock(data: ClockSample | undefined) {
  const client = useQueryClient()
  const [, tick] = useReducer((value: number) => value + 1, 0)
  // Anchor before the request: transport latency may hide a record slightly early,
  // but never extends its lifetime. The browser's wall clock is not trusted.
  const now = data
    ? Date.parse(data.server_now) +
      Math.max(0, performance.now() - data.sampledAt)
    : undefined
  useEffect(() => {
    if (!data?.next_change_at) return
    const remaining =
      Date.parse(data.next_change_at) -
      Date.parse(data.server_now) -
      Math.max(0, performance.now() - data.sampledAt)
    const timer = window.setTimeout(
      () => {
        tick()
        void client.invalidateQueries(
          { queryKey: ['announcements'] },
          { cancelRefetch: false },
        )
      },
      Math.min(2_147_483_647, Math.max(0, remaining)),
    )
    return () => window.clearTimeout(timer)
  }, [data, client])
  useEffect(() => {
    const wake = () => {
      tick()
      if (document.visibilityState === 'visible')
        void client.invalidateQueries(
          { queryKey: ['announcements'] },
          { cancelRefetch: false },
        )
    }
    window.addEventListener('focus', wake)
    document.addEventListener('visibilitychange', wake)
    return () => {
      window.removeEventListener('focus', wake)
      document.removeEventListener('visibilitychange', wake)
    }
  }, [client])
  return now
}

export function useAnnouncements(
  scope: AnnouncementScope,
  filters: AnnouncementFilters,
  pageSize = 4,
) {
  const { profile } = useAuth()
  const query = useQuery({
    queryKey: [
      'announcements',
      'overview',
      profile?.id,
      scope,
      filters,
      pageSize,
    ],
    refetchInterval: 60_000,
    queryFn: async ({ signal }) => {
      const sampledAt = performance.now()
      const { data, error } = await getSupabase()
        .rpc('announcements_overview', {
          p_scope: scope,
          p_search: filters.search,
          p_status: filters.status,
          p_page: filters.page,
          p_page_size: pageSize,
        })
        .abortSignal(signal)
      if (error) throw error
      return { ...data, sampledAt }
    },
  })
  const now = useScheduleClock(query.data)
  const items =
    query.data?.items.filter(
      (item) =>
        scope === 'manage' ||
        (now !== undefined && announcementStatus(item, now) === 'active'),
    ) ?? []
  return { ...query, now, items }
}

export function useAnnouncement(
  id: string | undefined,
  scope: AnnouncementScope,
) {
  const { profile } = useAuth()
  const query = useQuery({
    queryKey: ['announcements', 'detail', profile?.id, scope, id],
    enabled: Boolean(id),
    refetchInterval: 60_000,
    queryFn: async ({ signal }) => {
      const sampledAt = performance.now()
      const { data, error } = await getSupabase()
        .rpc('announcement_detail', { p_id: id!, p_scope: scope })
        .abortSignal(signal)
      if (error) throw error
      return { ...data, sampledAt }
    },
  })
  const now = useScheduleClock(query.data)
  const announcement = query.data?.announcement
  const visible =
    !query.isError &&
    announcement &&
    (scope === 'manage' ||
      (now !== undefined && announcementStatus(announcement, now) === 'active'))
  return { ...query, now, announcement: visible ? announcement : undefined }
}

export async function saveAnnouncement(
  input: AnnouncementInput,
  requestId: string,
  current?: Announcement,
  republish = false,
) {
  const fields = {
    p_title: input.title.trim(),
    p_description: input.description.trim(),
    p_starts_at: input.starts_at,
    p_ends_at: input.ends_at,
  }
  const result = current
    ? await getSupabase().rpc('update_announcement', {
        ...fields,
        p_id: current.id,
        p_expected_updated_at: current.updated_at,
        p_republish: republish,
      })
    : await getSupabase().rpc('create_announcement', {
        ...fields,
        p_request_id: requestId,
      })
  if (result.error) throw result.error
  return result.data
}
export async function archiveAnnouncement(announcement: Announcement) {
  const { data, error } = await getSupabase().rpc('archive_announcement', {
    p_id: announcement.id,
    p_expected_updated_at: announcement.updated_at,
  })
  if (error) throw error
  return data
}
export function isAnnouncementConflict(error: unknown) {
  const code = (error as { code?: string } | null)?.code
  return code === 'PT409' || code === '40001'
}

export function announcementError(error: unknown) {
  const { code, message = '' } = (error ?? {}) as {
    code?: string
    message?: string
  }
  if (isAnnouncementConflict(error))
    return 'Pengumuman telah diubah admin lain. Muat ulang data sebelum menyimpan kembali.'
  if (code === 'P0002' || code === '22P02')
    return 'Pengumuman tidak ditemukan atau sudah tidak tayang.'
  if (code === '42501')
    return 'Anda tidak memiliki akses. Periksa sesi atau status akun Anda.'
  if (message.includes('ANNOUNCEMENT_END_PASSED'))
    return 'Waktu selesai tayang harus masih di masa depan.'
  if (message.includes('ANNOUNCEMENT_REQUEST_CONFLICT'))
    return 'Percobaan sebelumnya sudah tersimpan dengan isi berbeda. Periksa daftar sebelum membuat pengumuman baru.'
  if (message.includes('INVALID_ANNOUNCEMENT_ACTION'))
    return 'Status pengumuman telah berubah. Muat ulang data sebelum melanjutkan.'
  if (['22023', '22007', '22008', '23514'].includes(code ?? ''))
    return 'Periksa judul, deskripsi, dan rentang waktu tayang yang diisi.'
  return 'Pengumuman belum berhasil dimuat atau disimpan. Periksa koneksi lalu coba lagi.'
}
