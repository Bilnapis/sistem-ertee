export type DuesStatus = 'belum_bayar' | 'menunggu_verifikasi' | 'lunas'
export type PaymentMethod = 'tunai' | 'transfer'
export type PaymentStatus = 'diajukan' | 'disetujui' | 'ditolak' | 'dibatalkan'
export type DuesProof = {
  path: string
  name: string
  size: number
  type: string
}
export type DuesInvoice = {
  id: string
  resident_id: string
  identity_snapshot: {
    full_name: string
    house_number: string | null
  }
  period: string
  amount: number
  due_date: string
  status: DuesStatus
  method: PaymentMethod | null
  payment_date?: string | null
  created_at: string
  updated_at: string
}
export type DuesPayment = {
  id: string
  invoice_id: string
  method: PaymentMethod
  payment_date: string
  notes: string
  attachment: DuesProof | null
  bank_snapshot: {
    bank_name: string
    bank_account: string
    bank_holder: string
  } | null
  status: PaymentStatus
  submitted_by: string
  reviewed_by: string | null
  reviewed_at: string | null
  review_note: string
  cancelled_by: string | null
  cancelled_at: string | null
  cancellation_note: string
  created_at: string
  updated_at: string
}
export type DuesEvent = {
  id: number
  invoice_id: string | null
  payment_id: string | null
  action: string
  actor_id: string
  actor_name: string
  actor_role: string
  note: string
  details: Record<string, string | number>
  occurred_at: string
}
export type DuesRate = {
  effective_month: string
  amount: number
  due_day: number
  updated_by: string | null
}
export type DuesConfiguration = {
  activated_month: string
  bank_name: string
  bank_account: string
  bank_holder: string
  updated_at: string
  current_rate: DuesRate
  next_rate: DuesRate
  next_month: string
}
export type DuesDetail = {
  invoice: DuesInvoice
  payments: DuesPayment[]
  events: DuesEvent[]
}
export type DuesOverview = {
  current: DuesInvoice | null
  period: string
  items: DuesInvoice[]
  total: number
  configuration: DuesConfiguration
  summary: Record<'total' | DuesStatus | 'income', number>
}
export type DuesFilters = {
  period: string
  status: DuesStatus | 'all'
  method: PaymentMethod | 'all'
  search: string
  page: number
}
