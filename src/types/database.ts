
import type { Database } from '@/integrations/supabase/types'

// Database row types for easy reuse
export type PlanStopRow = Database['public']['Tables']['plan_stops']['Row'] & {
  venue?: Database['public']['Tables']['venues']['Row']
}

export type ProfileRow = Database['public']['Tables']['profiles']['Row']

export type FriendshipRow = Database['public']['Tables']['friendships']['Row'] & {
  profiles: Pick<ProfileRow, 'username' | 'display_name' | 'avatar_url'>
}

export type FloqRow = Database['public']['Tables']['floqs']['Row']

export type FloqParticipantRow = Database['public']['Tables']['floq_participants']['Row'] & {
  profiles?: ProfileRow
}

export type PlanParticipantRow = Database['public']['Tables']['plan_participants']['Row'] & {
  profiles?: ProfileRow
}

export type PlanCommentRow = Database['public']['Tables']['plan_comments']['Row'] & {
  profiles: Pick<ProfileRow, 'username' | 'display_name' | 'avatar_url'>
}

export type FloqMessageRow = Database['public']['Tables']['floq_messages']['Row'] & {
  profiles: Pick<ProfileRow, 'username' | 'display_name' | 'avatar_url'>
}

export type DailyAfterglowRow = Database['public']['Tables']['daily_afterglow']['Row']

// Helper types for JSON fields
export type JsonArray = Array<any>
export type JsonObject = { [key: string]: any }

// RPC response types
export type FloqFullDetailsResponse = {
  id: string
  title: string
  description: string
  primary_vibe: string
  creator_id: string
  participant_count: number
  starts_at: string
  ends_at: string
  visibility: string
  pinned_note: string | null
  participants: JsonArray
  pending_invites: JsonArray
}
