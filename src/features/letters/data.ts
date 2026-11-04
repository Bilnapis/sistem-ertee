import { useQuery } from '@tanstack/react-query'
import type {
  LetterAttachment,
  LetterFilters,
  LetterRequest,
  LetterStatus,
  LetterType,
  ResidentProfile,
} from '../../lib/database.types'
import { getSupabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthProvider'

export const letterTypes: Record<LetterType, string> = {
  domisili: 'Surat Pengantar Domisili',
  usaha: 'Surat Pengantar Usaha',
  skck: 'Surat Pengantar SKCK',
  tidak_mampu: 'Surat Pengantar Tidak Mampu',
  pindah: 'Surat Pengantar Pindah',
  administrasi_kependudukan: 'Surat Pengantar Administrasi Kependudukan',
  keterangan_warga: 'Surat Keterangan Warga',
  lainnya: 'Lainnya',
}
export const letterStatuses: Record<LetterStatus, string> = {
  pengajuan: 'Pengajuan',
  diproses: 'Diproses',
  selesai: 'Selesai',
}
export const attachmentBucket = 'letter-attachments'
export const maxAttachmentSize = 5 * 1024 * 1024
const extensions: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'application/pdf': 'pdf',
}
export const isLetterType = (value: string): value is LetterType =>
  Object.hasOwn(letterTypes, value)
export const isLetterStatus = (value: string): value is LetterStatus =>
  Object.hasOwn(letterStatuses, value)
export function eligibilityMessage(profile: ResidentProfile) {
  if (!profile.is_active || profile.archived_at)
    return 'Akun tidak aktif. Hubungi pengurus RT untuk mengakses layanan.'
  if (!profile.family_card_number || !profile.gender || !profile.marital_status)
    return 'Lengkapi profil Anda terlebih dahulu agar pengurus dapat memverifikasi data.'
  if (profile.verification_status !== 'terverifikasi')
    return 'Pengajuan surat memerlukan profil terverifikasi. Periksa status profil atau hubungi pengurus RT.'
  return null
}
export function validateAttachment(file: File) {
  if (!extensions[file.type] || !/\.(jpe?g|png|pdf)$/i.test(file.name))
    return 'Pilih berkas JPG, PNG, atau PDF.'
  if (file.size < 1 || file.size > maxAttachmentSize)
    return 'Ukuran berkas harus lebih dari 0 dan maksimal 5 MB.'
  if (file.name.length > 255) return 'Nama berkas maksimal 255 karakter.'
  return null
}
async function digest(bytes: ArrayBuffer) {
  return Array.from(
    new Uint8Array(await crypto.subtle.digest('SHA-256', bytes)),
  )
    .map((value) => value.toString(16).padStart(2, '0'))
    .join('')
}
export async function uploadAttachment(
  userId: string,
  requestId: string,
  file: File,
): Promise<LetterAttachment> {
  const validation = validateAttachment(file)
  if (validation) throw new Error(validation)
  const checksum = await digest(await file.arrayBuffer())
  const path = `${userId}/${requestId}/${checksum}.${extensions[file.type]}`
  const storage = getSupabase().storage.from(attachmentBucket)
  const { error } = await storage.upload(path, file, {
    upsert: false,
    contentType: file.type,
  })
  if (error) {
    // A lost upload response is recoverable without overwriting an immutable object.
    const existing = await storage.download(path)
    if (
      existing.error ||
      !existing.data ||
      (await digest(await existing.data.arrayBuffer())) !== checksum
    )
      throw error
  }
  return { path, name: file.name, size: file.size, type: file.type }
}
export function useLetters(manage: boolean, filters: LetterFilters) {
  const { profile } = useAuth()
  const scope = manage ? 'all' : 'mine'
  return useQuery({
    queryKey: ['letters', scope, profile?.id, filters],
    queryFn: async ({ signal }) => {
      const { data, error } = await getSupabase()
        .rpc('list_letter_requests', {
          p_scope: scope,
          p_search: filters.search,
          p_type: filters.type,
          p_status: filters.status,
          p_sort: filters.sort,
          p_page: filters.page,
        })
        .abortSignal(signal)
      if (error) throw error
      return data
    },
  })
}
export function useLetterSummary(enabled: boolean) {
  return useQuery({
    queryKey: ['letters', 'summary'],
    enabled,
    queryFn: async ({ signal }) => {
      const { data, error } = await getSupabase()
        .rpc('letter_summary')
        .abortSignal(signal)
      if (error) throw error
      return data
    },
  })
}
export function useLetter(id: string | undefined, manage: boolean) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['letters', 'detail', manage ? 'all' : 'mine', profile?.id, id],
    enabled: Boolean(id),
    queryFn: async ({ signal }) => {
      let query = getSupabase()
        .from('letter_requests')
        .select('*')
        .eq('id', id!)
      if (!manage) query = query.eq('applicant_id', profile!.id)
      const { data, error } = await query.abortSignal(signal).maybeSingle()
      if (error) throw error
      if (!data) throw new Error('LETTER_NOT_FOUND')
      return data
    },
  })
}
export function useLetterHistory(id: string, enabled: boolean) {
  return useQuery({
    queryKey: ['letters', 'history', id],
    enabled,
    queryFn: async ({ signal }) => {
      const { data, error } = await getSupabase()
        .from('letter_events')
        .select('*')
        .eq('request_id', id)
        .order('occurred_at')
        .order('id')
        .abortSignal(signal)
      if (error) throw error
      return data
    },
  })
}
export async function advanceLetter(request: LetterRequest) {
  const { data, error } = await getSupabase()
    .rpc('advance_letter_request', {
      p_id: request.id,
      p_status: request.status === 'pengajuan' ? 'diproses' : 'selesai',
      p_expected_updated_at: request.updated_at,
    })
    .single<LetterRequest>()
  if (error) throw error
  return data
}
export async function downloadAttachment(attachment: LetterAttachment) {
  const { data, error } = await getSupabase()
    .storage.from(attachmentBucket)
    .download(attachment.path)
  if (error) throw error
  const url = URL.createObjectURL(data)
  const link = document.createElement('a')
  link.href = url
  link.download = attachment.name
  document.body.append(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export function letterError(error: unknown) {
  const { code, message = '' } = (error ?? {}) as {
    code?: string
    message?: string
  }
  if (code === '40001' || message.includes('STALE_LETTER'))
    return 'Status telah diubah pengurus lain. Muat ulang detail sebelum melanjutkan.'
  if (
    message.includes('LETTER_NOT_FOUND') ||
    code === 'P0002' ||
    code === '22P02'
  )
    return 'Pengajuan tidak ditemukan atau tidak dapat diakses.'
  if (
    message.includes('PROFILE_NOT_VERIFIED') ||
    message.includes('INCOMPLETE_PROFILE')
  )
    return 'Lengkapi profil dan tunggu verifikasi pengurus sebelum mengajukan surat.'
  if (message.includes('LETTER_REQUEST_CONFLICT'))
    return 'Isi percobaan ulang berbeda. Periksa daftar pengajuan sebelum membuat permohonan baru.'
  if (message.includes('INVALID_ATTACHMENT'))
    return 'Lampiran belum tersimpan atau tidak valid. Unggah ulang berkas JPG, PNG, atau PDF maksimal 5 MB.'
  if (code === '42501')
    return 'Akses tidak tersedia. Periksa sesi atau status akun Anda.'
  if (code === '22023' || code === '23514')
    return 'Periksa kembali jenis surat, keperluan, dan nomor HP pada formulir.'
  return 'Permintaan belum berhasil. Periksa koneksi lalu coba lagi.'
}
