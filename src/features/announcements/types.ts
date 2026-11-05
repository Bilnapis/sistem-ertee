export type AnnouncementStatus = 'scheduled' | 'active' | 'ended' | 'archived'
export type AnnouncementScope = 'active' | 'manage'
export type AnnouncementInput = {
  title: string
  description: string
  starts_at: string
  ends_at: string
}
export type Announcement = AnnouncementInput & {
  id: string
  created_by: string
  updated_by: string
  archived_at: string | null
  created_at: string
  updated_at: string
}
export type AnnouncementClock = {
  server_now: string
  next_change_at: string | null
}
export type AnnouncementOverview = AnnouncementClock & {
  items: Announcement[]
  total: number
}
export type AnnouncementDetail = AnnouncementClock & {
  announcement: Announcement
}
export type AnnouncementFilters = {
  search: string
  status: AnnouncementStatus | 'all'
  page: number
}
