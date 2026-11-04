import { useQuery } from '@tanstack/react-query'
import { getSupabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import type { DuesFilters, DuesProof, DuesStatus, PaymentMethod } from './types'

export const duesStatuses: Record<DuesStatus, string> = {
  belum_bayar: 'Belum Bayar',
  menunggu_verifikasi: 'Menunggu Verifikasi',
  lunas: 'Lunas',
}
export const paymentMethods: Record<PaymentMethod, string> = {
  tunai: 'Tunai/Cash',
  transfer: 'Transfer',
}
export const paymentStatuses = {
  diajukan: 'Menunggu Verifikasi',
  disetujui: 'Disetujui',
  ditolak: 'Ditolak',
  dibatalkan: 'Dibatalkan',
}
export const rupiah = (value: number) =>
  new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  })
    .format(value)
    .replace(/\s/g, '')
export const dateOnly = (value: string) =>
  new Intl.DateTimeFormat('id-ID', {
    dateStyle: 'medium',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(`${value.slice(0, 10)}T12:00:00+07:00`))
export const monthLabel = (value: string) =>
  new Intl.DateTimeFormat('id-ID', {
    month: 'long',
    year: 'numeric',
    timeZone: 'Asia/Jakarta',
  }).format(new Date(`${value.slice(0, 10)}T12:00:00+07:00`))
export function todayWib() {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Jakarta',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(new Date())
  return ['year', 'month', 'day']
    .map((type) => parts.find((part) => part.type === type)!.value)
    .join('-')
}
export const isDuesStatus = (value: string): value is DuesStatus =>
  Object.hasOwn(duesStatuses, value)
export const isPaymentMethod = (value: string): value is PaymentMethod =>
  Object.hasOwn(paymentMethods, value)
export function useDues(manage: boolean, filters: DuesFilters) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['dues', 'list', profile?.id, manage, filters],
    queryFn: async ({ signal }) => {
      const { data, error } = await getSupabase()
        .rpc('dues_overview', {
          p_scope: manage ? 'all' : 'mine',
          p_period: filters.period ? `${filters.period}-01` : null,
          p_status: filters.status,
          p_method: filters.method,
          p_search: filters.search,
          p_page: filters.page,
        })
        .abortSignal(signal)
      if (error) throw error
      return data
    },
  })
}
export function useDuesDetail(id?: string) {
  const { profile } = useAuth()
  return useQuery({
    queryKey: ['dues', 'detail', profile?.id, id],
    enabled: Boolean(id),
    queryFn: async ({ signal }) => {
      const { data, error } = await getSupabase()
        .rpc('dues_detail', { p_id: id! })
        .abortSignal(signal)
      if (error) throw error
      return data
    },
  })
}
export function useDuesConfiguration() {
  return useQuery({
    queryKey: ['dues', 'configuration'],
    queryFn: async ({ signal }) => {
      const { data, error } = await getSupabase()
        .rpc('dues_configuration')
        .abortSignal(signal)
      if (error) throw error
      return data
    },
  })
}
const extensions: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'application/pdf': 'pdf',
}
export function validateProof(file: File) {
  if (!extensions[file.type] || !/\.(jpe?g|png|pdf)$/i.test(file.name))
    return 'Pilih bukti JPG, PNG, atau PDF.'
  if (file.size < 1 || file.size > 5 * 1024 * 1024)
    return 'Ukuran bukti harus lebih dari 0 dan maksimal 5 MB.'
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
export async function uploadProof(
  userId: string,
  requestId: string,
  file: File,
): Promise<DuesProof> {
  const invalid = validateProof(file)
  if (invalid) throw new Error(invalid)
  const checksum = await digest(await file.arrayBuffer())
  const path = `${userId}/${requestId}/${checksum}.${extensions[file.type]}`
  const storage = getSupabase().storage.from('dues-proofs')
  const { error } = await storage.upload(path, file, {
    upsert: false,
    contentType: file.type,
  })
  if (error) {
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
export async function downloadProof(proof: DuesProof) {
  const { data, error } = await getSupabase()
    .storage.from('dues-proofs')
    .download(proof.path)
  if (error) throw error
  const url = URL.createObjectURL(data),
    link = document.createElement('a')
  link.href = url
  link.download = proof.name
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}
export function duesError(error: unknown) {
  const { code, message = '' } = (error ?? {}) as {
    code?: string
    message?: string
  }
  if (message.includes('DUES_PAYMENT_EXISTS'))
    return 'Tagihan ini sudah dibayar atau sedang diverifikasi. Muat ulang detail.'
  if (code === '40001' || message.includes('STALE_DUES'))
    return 'Data sudah berubah. Muat ulang sebelum melanjutkan.'
  if (message.includes('DUES_REQUEST_CONFLICT'))
    return 'Konfirmasi sebelumnya mungkin sudah tersimpan. Periksa detail tagihan sebelum mengirim ulang.'
  if (message.includes('BANK_NOT_CONFIGURED'))
    return 'Rekening transfer belum diatur. Gunakan Tunai/Cash atau hubungi pengurus.'
  if (message.includes('INVALID_DUES_PROOF'))
    return 'Bukti belum tersimpan atau tidak valid. Unggah JPG, PNG, atau PDF maksimal 5 MB.'
  if (message.includes('DUES_NOTE_REQUIRED'))
    return 'Isi alasan penolakan atau pembatalan.'
  if (code === 'P0002' || code === '22P02')
    return 'Tagihan tidak ditemukan atau tidak dapat diakses.'
  if (code === '42501')
    return 'Akses tidak tersedia. Periksa sesi dan status akun Anda.'
  if (code === '22023' || code === '23514')
    return 'Periksa kembali data pembayaran atau pengaturan yang Anda isi.'
  return 'Permintaan belum berhasil. Periksa koneksi lalu coba lagi.'
}
