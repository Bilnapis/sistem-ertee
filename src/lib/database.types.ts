import type { Gender, MaritalStatus, ResidentRole } from '../../supabase/functions/_shared/resident'
export type { ResidentFields, ResidentRole } from '../../supabase/functions/_shared/resident'
export type VerificationStatus = 'menunggu_verifikasi' | 'terverifikasi' | 'perlu_perbaikan'
export type ResidentProfile = {
  id: string
  email: string
  full_name: string
  nik: string
  phone: string
  address: string
  house_block: string
  family_card_number: string | null
  gender: Gender | null
  marital_status: MaritalStatus | null
  house_number: string | null
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
export type ResidentEvent = { id: number; profile_id: string; actor_id: string | null; actor_name: string | null; action: string; details: Record<string, string | boolean | null>; occurred_at: string }
export type ResidentFilters = {
  search: string; status: 'all' | 'active' | 'inactive' | 'archived'; role: ResidentRole | 'all'
  verification: VerificationStatus | 'all'; sort: 'newest' | 'name'; page: number
}
export type ResidentDirectory = { items: ResidentProfile[]; total: number }
export type ResidentSummary = Record<VerificationStatus | 'total', number>
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ResidentProfile
        Insert: Omit<ResidentProfile, 'created_at' | 'updated_at'>
        Update: never
        Relationships: []
      }
      resident_events: { Row: ResidentEvent; Insert: never; Update: never; Relationships: [] }
    }
    Views: { [_ in never]: never }
    Functions: {
      resident_management_access: { Args: Record<string, never>; Returns: boolean }
      list_residents: { Args: { p_search: string; p_status: string; p_role: string; p_verification: string; p_sort: string; p_page: number }; Returns: ResidentDirectory }
      resident_summary: { Args: Record<string, never>; Returns: ResidentSummary }
      update_resident: { Args: { p_id: string; p_data: Json; p_expected_updated_at: string }; Returns: ResidentProfile }
      review_resident: { Args: { p_id: string; p_status: string; p_note: string; p_expected_updated_at: string }; Returns: ResidentProfile }
      set_resident_archive: { Args: { p_id: string; p_archived: boolean; p_expected_updated_at: string }; Returns: ResidentProfile }
    }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
