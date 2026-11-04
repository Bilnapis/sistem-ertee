import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import type {
  Complaint,
  ComplaintAction,
  ComplaintCategory,
  ComplaintFilters,
  ComplaintStatus,
} from './types'

export const complaintCategories: Record<ComplaintCategory, string> = {
  fasilitas_umum: 'Fasilitas Umum',
  keamanan: 'Keamanan',
  kebersihan_sampah: 'Kebersihan dan Sampah',
}
export const complaintStatuses: Record<ComplaintStatus, string> = {
  diajukan: 'Diajukan',
  diproses: 'Diproses',
  selesai: 'Selesai',
  ditolak: 'Ditolak',
}
export const complaintActions: Record<ComplaintAction | 'submitted', string> = {
  submitted: 'Pengaduan diajukan',
  start: 'Mulai proses',
  complete: 'Penanganan selesai',
  reject: 'Pengaduan ditolak',
  recategorize: 'Kategori diperbaiki',
}
export const isComplaintCategory = (
  value: string,
): value is ComplaintCategory => Object.hasOwn(complaintCategories, value)
export const isComplaintStatus = (value: string): value is ComplaintStatus =>
  Object.hasOwn(complaintStatuses, value)
export function validDate(value: string) {
  return (
    /^(?!0000)\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) &&
    new Date(value).toISOString().slice(0, 10) === value
  )
}
export function useComplaints(manage: boolean, filters: ComplaintFilters) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: [
      'complaints',
      'overview',
      manage ? 'all' : 'mine',
      profile?.id,
      filters,
    ],
    enabled: !filters.from || !filters.to || filters.from <= filters.to,
    queryFn: async ({ signal }) => {
      const { data, error } = await getSupabase()
        .rpc('complaints_overview', {
          p_scope: manage ? 'all' : 'mine',
          p_search: filters.search,
          p_category: filters.category,
          p_status: filters.status,
          p_from: filters.from || null,
          p_to: filters.to || null,
          p_sort: filters.sort,
          p_page: filters.page,
        })
        .abortSignal(signal)
      if (error) throw error
      return data
    },
  })
}
export function useComplaint(id: string | undefined, manage: boolean) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: [
      'complaints',
      'detail',
      manage ? 'all' : 'mine',
      profile?.id,
      id,
    ],
    enabled: Boolean(id),
    queryFn: async ({ signal }) => {
      const { data, error } = await getSupabase()
        .rpc('complaint_detail', {
          p_id: id!,
          p_scope: manage ? 'all' : 'mine',
        })
        .abortSignal(signal)
      if (error) throw error
      return data
    },
  })
}
export async function reviewComplaint(
  complaint: Complaint,
  action: ComplaintAction,
  category: ComplaintCategory,
  note: string,
) {
  const { data, error } = await getSupabase().rpc('review_complaint', {
    p_id: complaint.id,
    p_action: action,
    p_category: category,
    p_note: action === 'recategorize' ? '' : note.trim(),
    p_expected_updated_at: complaint.updated_at,
  })
  if (error) throw error
  return data
}
export function complaintError(error: unknown) {
  const { code, message = '' } = (error ?? {}) as {
    code?: string
    message?: string
  }
  if (code === '40001')
    return 'Pengaduan telah diubah pengurus lain. Muat ulang detail sebelum melanjutkan.'
  if (
    code === 'P0002' ||
    code === '22P02' ||
    message.includes('COMPLAINT_NOT_FOUND')
  )
    return 'Pengaduan tidak ditemukan atau tidak dapat diakses.'
  if (message.includes('COMPLAINT_REQUEST_CONFLICT'))
    return 'Percobaan sebelumnya sudah tersimpan dengan isi berbeda. Periksa daftar pengaduan sebelum membuat pengaduan baru.'
  if (message.includes('COMPLAINT_NOTE_REQUIRED'))
    return 'Isi hasil penanganan atau alasan penolakan terlebih dahulu.'
  if (message.includes('INVALID_COMPLAINT_TRANSITION'))
    return 'Tindakan tidak sesuai status pengaduan. Muat ulang detail sebelum melanjutkan.'
  if (code === '42501')
    return 'Akses tidak tersedia. Periksa sesi atau status akun Anda.'
  if (
    code === '22023' ||
    code === '22007' ||
    code === '22008' ||
    code === '23514'
  )
    return 'Periksa judul, deskripsi, kategori, catatan, dan rentang tanggal yang diisi.'
  return 'Permintaan belum berhasil. Periksa koneksi lalu coba lagi.'
}
