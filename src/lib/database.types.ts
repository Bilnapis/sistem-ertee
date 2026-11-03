export type ResidentProfile = {
  id: string
  email: string
  full_name: string
  nik: string
  phone: string
  address: string
  house_block: string
  role: 'warga' | 'ketua_rt' | 'pengurus_rt'
  is_active: boolean
  verification_status: 'menunggu_verifikasi' | 'terverifikasi' | 'perlu_perbaikan'
  created_at: string
  updated_at: string
}

export type Database = {
  public: {
    Tables: {
      profiles: {
        Row: ResidentProfile
        Insert: Omit<ResidentProfile, 'created_at' | 'updated_at'>
        Update: Partial<Pick<ResidentProfile, 'full_name' | 'phone' | 'address' | 'house_block'>>
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: { [_ in never]: never }
    CompositeTypes: { [_ in never]: never }
  }
}
