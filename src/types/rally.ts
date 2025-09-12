export type RallyId = string

export type Rally = {
  id: RallyId
  creator_id: string
  created_at: string
  expires_at: string
  center: { lng: number; lat: number } // if selected in view, denormalize server geom
  venue_id?: string | null
  note?: string | null
  status: 'active' | 'ended' | 'expired'
}

export type RallyInvite = {
  rally_id: RallyId
  to_profile: string
  status: 'pending' | 'joined' | 'declined'
  responded_at?: string | null
}