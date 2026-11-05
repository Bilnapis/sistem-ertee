import type {
  Gender,
  MaritalStatus,
  ResidentRole,
} from '../../supabase/functions/_shared/resident'
import type {
  Complaint,
  ComplaintEvent,
  ComplaintOverview,
  ComplaintDetail,
} from '../features/complaints/types'
import type {
  Announcement,
  AnnouncementOverview,
  AnnouncementDetail,
} from '../features/announcements/types'
import type {
  DuesConfiguration,
  DuesDetail,
  DuesOverview,
  DuesInvoice,
  DuesPayment,
  DuesEvent,
  DuesRate,
} from '../features/dues/types'
export type {
  ResidentFields,
  ResidentRole,
} from '../../supabase/functions/_shared/resident'
export type VerificationStatus =
  'menunggu_verifikasi' | 'terverifikasi' | 'perlu_perbaikan'
export type ResidentProfile = {
  id: string
  email: string
  full_name: string
  nik: string
  phone: string
  address: string
  family_card_number: string | null
  gender: Gender | null
  marital_status: MaritalStatus | null
  reviewed_by: string | null
  reviewed_at: string | null
  review_note: string | null
  archived_at: string | null
  created_by: string | null
  role: ResidentRole
  is_active: boolean
  verification_status: VerificationStatus
  created_at: string
  updated_at: string
}
export type ResidentEvent = {
  id: number
  profile_id: string
  actor_id: string | null
  actor_name: string | null
  action: string
  details: Record<string, string | boolean | null>
  occurred_at: string
}
export type ResidentFilters = {
  search: string
  status: 'all' | 'active' | 'inactive' | 'archived'
  role: ResidentRole | 'all'
  verification: VerificationStatus | 'all'
  sort: 'newest' | 'name'
  page: number
}
export type ResidentDirectory = { items: ResidentProfile[]; total: number }
export type ResidentSummary = Record<VerificationStatus | 'total', number>
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type LetterStatus = 'pengajuan' | 'diproses' | 'selesai'
export type LetterType =
  | 'domisili'
  | 'usaha'
  | 'skck'
  | 'tidak_mampu'
  | 'pindah'
  | 'administrasi_kependudukan'
  | 'keterangan_warga'
  | 'lainnya'
export type LetterAttachment = {
  path: string
  name: string
  size: number
  type: string
}
export type LetterIdentity = {
  full_name: string
  nik: string
  family_card_number: string
  address: string
}
export type LetterRequest = {
  id: string
  number: number
  reference: string
  applicant_id: string
  identity_snapshot: LetterIdentity
  letter_type: LetterType
  letter_type_label: string
  purpose: string
  contact_phone: string
  additional_notes: string
  attachment: LetterAttachment | null
  status: LetterStatus
  created_at: string
  updated_at: string
}
export type LetterEvent = {
  id: number
  request_id: string
  previous_status: LetterStatus | null
  status: LetterStatus
  actor_id: string | null
  actor_name: string
  actor_role: ResidentRole
  occurred_at: string
}
export type LetterFilters = {
  search: string
  type: LetterType | 'all'
  status: LetterStatus | 'all'
  sort: 'newest' | 'oldest'
  page: number
}
export type LetterDirectory = { items: LetterRequest[]; total: number }
export type LetterSummary = Record<LetterStatus | 'total', number>

type ReadOnlyTable<Row> = {
  Row: Row
  Insert: never
  Update: never
  Relationships: []
}

export type Database = {
  public: {
    Tables: {
      announcements: ReadOnlyTable<Announcement>
      complaints: ReadOnlyTable<Complaint & { submitted_payload: Json }>
      complaint_events: ReadOnlyTable<ComplaintEvent>
      dues_settings: ReadOnlyTable<
        Omit<DuesConfiguration, 'current_rate' | 'next_rate' | 'next_month'> & {
          id: boolean
        }
      >
      dues_rates: ReadOnlyTable<DuesRate>
      dues_invoices: ReadOnlyTable<Omit<DuesInvoice, 'payment_date'>>
      dues_payments: ReadOnlyTable<DuesPayment & { submitted_payload: Json }>
      dues_events: ReadOnlyTable<DuesEvent>
      dues_cash_entries: ReadOnlyTable<{
        id: string
        payment_id: string
        invoice_id: string
        amount: number
        transaction_date: string
        status: 'tercatat' | 'dibatalkan'
        created_at: string
        cancelled_at: string | null
      }>
      profiles: {
        Row: ResidentProfile
        Insert: Omit<ResidentProfile, 'created_at' | 'updated_at'>
        Update: never
        Relationships: []
      }
      resident_events: {
        Row: ResidentEvent
        Insert: never
        Update: never
        Relationships: []
      }
      letter_requests: {
        Row: LetterRequest
        Insert: never
        Update: never
        Relationships: []
      }
      letter_events: {
        Row: LetterEvent
        Insert: never
        Update: never
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: {
      announcements_overview: {
        Args: {
          p_scope: string
          p_search: string
          p_status: string
          p_page: number
          p_page_size: number
        }
        Returns: AnnouncementOverview
      }
      announcement_detail: {
        Args: { p_id: string; p_scope: string }
        Returns: AnnouncementDetail
      }
      create_announcement: {
        Args: {
          p_request_id: string
          p_title: string
          p_description: string
          p_starts_at: string
          p_ends_at: string
        }
        Returns: Announcement
      }
      update_announcement: {
        Args: {
          p_id: string
          p_title: string
          p_description: string
          p_starts_at: string
          p_ends_at: string
          p_expected_updated_at: string
          p_republish: boolean
        }
        Returns: Announcement
      }
      archive_announcement: {
        Args: { p_id: string; p_expected_updated_at: string }
        Returns: Announcement
      }
      complaints_overview: {
        Args: {
          p_scope: string
          p_search: string
          p_category: string
          p_status: string
          p_from: string | null
          p_to: string | null
          p_sort: string
          p_page: number
        }
        Returns: ComplaintOverview
      }
      complaint_detail: {
        Args: { p_id: string; p_scope: string }
        Returns: ComplaintDetail
      }
      submit_complaint: {
        Args: {
          p_request_id: string
          p_title: string
          p_description: string
          p_category: string
        }
        Returns: Complaint
      }
      review_complaint: {
        Args: {
          p_id: string
          p_action: string
          p_category: string | null
          p_note: string
          p_expected_updated_at: string
        }
        Returns: ComplaintDetail
      }
      dues_configuration: {
        Args: Record<string, never>
        Returns: DuesConfiguration
      }
      update_dues_configuration: {
        Args: {
          p_amount: number
          p_due_day: number
          p_bank_name: string
          p_bank_account: string
          p_bank_holder: string
          p_expected_updated_at: string
        }
        Returns: DuesConfiguration
      }
      dues_overview: {
        Args: {
          p_scope: string
          p_period: string | null
          p_status: string
          p_method: string
          p_search: string
          p_page: number
        }
        Returns: DuesOverview
      }
      dues_detail: { Args: { p_id: string }; Returns: DuesDetail }
      submit_dues_payment: {
        Args: {
          p_request_id: string
          p_invoice_id: string
          p_method: string
          p_payment_date: string
          p_notes: string
          p_attachment: Json
        }
        Returns: DuesDetail
      }
      review_dues_payment: {
        Args: {
          p_payment_id: string
          p_action: string
          p_note: string
          p_expected_updated_at: string
        }
        Returns: DuesDetail
      }
      submit_letter_request: {
        Args: {
          p_request_id: string
          p_letter_type: string
          p_purpose: string
          p_contact_phone: string
          p_additional_notes: string
          p_attachment: Json
        }
        Returns: LetterRequest
      }
      advance_letter_request: {
        Args: { p_id: string; p_status: string; p_expected_updated_at: string }
        Returns: LetterRequest
      }
      list_letter_requests: {
        Args: {
          p_scope: string
          p_search: string
          p_type: string
          p_status: string
          p_sort: string
          p_page: number
        }
        Returns: LetterDirectory
      }
      letter_summary: { Args: Record<string, never>; Returns: LetterSummary }
      resident_management_access: {
        Args: Record<string, never>
        Returns: boolean
      }
      list_residents: {
        Args: {
          p_search: string
          p_status: string
          p_role: string
          p_verification: string
          p_sort: string
          p_page: number
        }
        Returns: ResidentDirectory
      }
      resident_summary: {
        Args: Record<string, never>
        Returns: ResidentSummary
      }
      update_resident: {
        Args: { p_id: string; p_data: Json; p_expected_updated_at: string }
        Returns: ResidentProfile
      }
      review_resident: {
        Args: {
          p_id: string
          p_status: string
          p_note: string
          p_expected_updated_at: string
        }
        Returns: ResidentProfile
      }
      set_resident_archive: {
        Args: {
          p_id: string
          p_archived: boolean
          p_expected_updated_at: string
        }
        Returns: ResidentProfile
      }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
