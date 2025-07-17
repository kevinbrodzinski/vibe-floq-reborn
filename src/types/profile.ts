export type Profile = {
  id: string
  username: string
  display_name: string
  avatar_url: string | null
  full_name?: string | null
  bio?: string | null
  interests?: string[] | null
  custom_status?: string | null
  created_at?: string | null
}