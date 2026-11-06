import { useEffect, useState } from 'react'
import type { ReactNode } from 'react'
import { QueryClient, QueryClientProvider, useQuery, useQueryClient } from '@tanstack/react-query'
import { getSupabase } from '../../lib/supabase'
import { useAuth } from '../auth/AuthProvider'
import type { Json, ResidentFields, ResidentFilters, ResidentProfile, ResidentRole, VerificationStatus } from '../../lib/database.types'

export const roleLabels: Record<ResidentRole, string> = { ketua_rt: 'Ketua RT', pengurus_rt: 'Pengurus RT', warga: 'Warga' }
export const statusLabels: Record<VerificationStatus, string> = { menunggu_verifikasi: 'Menunggu Verifikasi', terverifikasi: 'Terverifikasi', perlu_perbaikan: 'Perlu Perbaikan' }
export const genderLabels = { laki_laki: 'Laki-laki', perempuan: 'Perempuan' }
export const maritalLabels = { belum_menikah: 'Belum Menikah', menikah: 'Menikah' }
export const isManager = (role?: ResidentRole) => role === 'ketua_rt' || role === 'pengurus_rt'
export const formatDate = (date: string) => new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short', timeZone: 'Asia/Jakarta' }).format(new Date(date)) + ' WIB'
export const maskIdentity = (value: string) => value.length === 16 ? `${value.slice(0, 4)}••••••••${value.slice(-4)}` : '—'
export const initials = (name: string) => name.trim().split(/\s+/).map(word => Array.from(word)[0]).filter(Boolean).slice(0, 2).join('').toLocaleUpperCase('id-ID')

function ScopedQueries({ children }: { children: ReactNode }) {
  const [client] = useState(() => new QueryClient({ defaultOptions: { queries: { staleTime: 15_000, retry: false, refetchOnWindowFocus: 'always' }, mutations: { retry: false } } }))
  useEffect(() => () => client.clear(), [client])
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>
}
export function ResidentQueryProvider({ children }: { children: ReactNode }) {
  const { session, profile, error } = useAuth()
  const scope = `${session?.user.id ?? 'guest'}:${profile?.role ?? 'loading'}:${profile?.is_active ?? false}:${Boolean(error)}`
  return <ScopedQueries key={scope}>{children}</ScopedQueries>
}
export function useDirectory(filters: ResidentFilters) {
  return useQuery({ queryKey: ['residents', 'list', filters], queryFn: async ({ signal }) => {
    const { data, error } = await getSupabase().rpc('list_residents', { p_search: filters.search, p_status: filters.status,
      p_role: filters.role, p_verification: filters.verification, p_sort: filters.sort, p_page: filters.page }).abortSignal(signal)
    if (error) throw error
    return data
  } })
}
export function useResidentSummary() {
  return useQuery({ queryKey: ['residents', 'summary'], queryFn: async ({ signal }) => {
    const { data, error } = await getSupabase().rpc('resident_summary').abortSignal(signal)
    if (error) throw error
    return data
  } })
}
export function useResident(id?: string) {
  return useQuery({ queryKey: ['residents', 'detail', id], enabled: Boolean(id), queryFn: async ({ signal }) => {
    const { data, error } = await getSupabase().from('profiles').select('*').eq('id', id!).abortSignal(signal).maybeSingle()
    if (error) throw error
    if (!data) throw { code: 'NOT_FOUND' }
    return data
  } })
}
export function useResidentHistory(id: string) {
  return useQuery({ queryKey: ['residents', 'history', id], queryFn: async ({ signal }) => {
    const { data, error } = await getSupabase().from('resident_events').select('*').eq('profile_id', id).order('occurred_at', { ascending: false }).order('id', { ascending: false }).limit(30).abortSignal(signal)
    if (error) throw error
    return data
  } })
}
export function useRefreshResidents() {
  const client = useQueryClient()
  const { retry } = useAuth()
  return async () => { retry(); await client.invalidateQueries({ queryKey: ['residents'] }) }
}
export async function updateResident(profile: ResidentProfile, fields: ResidentFields, access?: { role: ResidentRole; is_active: boolean }) {
  const { data, error } = await getSupabase().rpc('update_resident', { p_id: profile.id,
    p_data: { ...fields, ...access } as Json, p_expected_updated_at: profile.updated_at }).single()
  if (error) throw error
  return data
}
export async function reviewResident(profile: ResidentProfile, status: 'terverifikasi' | 'perlu_perbaikan', note: string) {
  const { error } = await getSupabase().rpc('review_resident', { p_id: profile.id, p_status: status, p_note: note, p_expected_updated_at: profile.updated_at })
  if (error) throw error
}
export async function archiveResident(profile: ResidentProfile, archived: boolean) {
  const { error } = await getSupabase().rpc('set_resident_archive', { p_id: profile.id, p_archived: archived, p_expected_updated_at: profile.updated_at })
  if (error) throw error
}
export function residentError(error: unknown) {
  const { code, message = '' } = (error ?? {}) as { code?: string; message?: string }
  if (message.includes('LAST_ACTIVE_MANAGER')) return 'Setidaknya satu Ketua RT atau Pengurus RT harus tetap aktif.'
  if (message.includes('STALE_PROFILE') || code === '40001') return 'Data telah berubah. Tutup formulir, muat ulang data, lalu coba lagi.'
  if (message.includes('REVIEW_NOTE_REQUIRED')) return 'Isi alasan perbaikan data.'
  if (message.includes('INCOMPLETE_PROFILE')) return 'Lengkapi identitas, nomor KK, jenis kelamin, dan status pernikahan terlebih dahulu.'
  if (code === '23505' || code === 'DUPLICATE_NIK') return 'NIK sudah digunakan warga lain.'
  if (code === 'DUPLICATE_EMAIL') return 'Email sudah digunakan akun lain.'
  if (code === 'REQUEST_CONFLICT') return 'Permintaan sudah digunakan. Periksa daftar warga sebelum mencoba lagi.'
  if (code === '42501' || code === 'ACCESS_DENIED') return 'Anda tidak memiliki akses untuk tindakan ini. Muat ulang halaman untuk memeriksa akun.'
  if (code === 'SESSION_REQUIRED') return 'Sesi telah berakhir. Silakan masuk kembali.'
  if (code === 'RESIDENT_ARCHIVED') return 'Pulihkan arsip terlebih dahulu sebelum mengubah akun warga.'
  if (code === 'PASSWORD_UPDATE_FAILED') return 'Password belum berhasil diperbarui. Silakan coba lagi.'
  if (code === 'NOT_FOUND' || code === 'P0002') return 'Data warga tidak ditemukan atau tidak dapat diakses.'
  if (code === '23514' || code === '22023' || code === 'INVALID_INPUT') return 'Periksa kembali kelengkapan dan format data pada formulir.'
  return 'Permintaan belum berhasil. Periksa koneksi dan coba lagi.'
}
