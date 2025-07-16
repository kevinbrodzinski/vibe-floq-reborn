// Types for better type safety
export interface PlanStop {
  id: string
  title: string
  venue: string
  description?: string
  startTime: string
  endTime?: string
  location?: string
  vibeMatch?: number
  status: 'confirmed' | 'suggested' | 'pending'
  color: string
  duration_minutes?: number
  stop_order?: number
  created_by?: string
  start_time?: string
  end_time?: string
  participants: string[]
}

export interface PlanParticipant {
  id: string
  name: string
  avatar: string
  status: 'confirmed' | 'pending' | 'declined'
  isEditing?: boolean
  lastActivity?: number
  role?: string
  checkInStatus?: 'checked-in' | 'checked-out'
}

export interface Plan {
  id: string
  title: string
  date: string
  stops: PlanStop[]
  participants: PlanParticipant[]
}