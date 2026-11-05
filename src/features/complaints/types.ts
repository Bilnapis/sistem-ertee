import type { ResidentRole } from '../../lib/database.types'

export type ComplaintStatus = 'diajukan' | 'diproses' | 'selesai' | 'ditolak'
export type ComplaintCategory =
  'fasilitas_umum' | 'keamanan' | 'kebersihan_sampah'
export type ComplaintAction = 'start' | 'complete' | 'reject' | 'recategorize'
export type Complaint = {
  id: string
  number: number
  reference: string
  applicant_id: string
  identity_snapshot: {
    full_name: string
  }
  title: string
  description: string
  category: ComplaintCategory
  status: ComplaintStatus
  resolution_note: string
  created_at: string
  updated_at: string
}
export type ComplaintEvent = {
  id: number
  complaint_id: string
  action: ComplaintAction | 'submitted'
  previous_status: ComplaintStatus | null
  status: ComplaintStatus
  previous_category: ComplaintCategory | null
  category: ComplaintCategory
  note: string
  actor_id: string
  actor_name: string
  actor_role: ResidentRole
  occurred_at: string
}
export type ComplaintFilters = {
  search: string
  category: ComplaintCategory | 'all'
  status: ComplaintStatus | 'all'
  from: string
  to: string
  sort: 'newest' | 'oldest'
  page: number
}
export type ComplaintOverview = {
  items: Complaint[]
  total: number
  summary: Record<ComplaintStatus, number> | null
}
export type ComplaintDetail = { complaint: Complaint; events: ComplaintEvent[] }
