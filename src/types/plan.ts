// Types for better type safety
export interface PlanStop {
  id: string
  title: string
  venue?: string
  description?: string
  startTime: string
  endTime: string
  location?: string
  vibeMatch?: number
  status: 'confirmed' | 'suggested' | 'pending'
  color: string
  duration_minutes?: number
  durationMinutes?: number // For backwards compatibility
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

// AI Suggestion Types
export interface TimeSlotSuggestion {
  startTime: string
  endTime: string
  confidence: number
  reason: string
  venueType?: string
  spacingScore?: number
}

export interface NovaTimeSuggestion {
  id: string
  startTime: string
  endTime: string
  confidence: number
  reasoning: string[]
  venueMetadata?: {
    type: string
    peakHours: string[]
    averageDuration: number
  }
  spacing: {
    beforeGap: number
    afterGap: number
    idealSpacing: boolean
  }
}

// Conflict Types
export interface ConflictInfo {
  stopId: string
  conflictsWith: string[]
  type: 'time_overlap' | 'travel_impossible' | 'venue_closed'
  severity: 'low' | 'medium' | 'high'
  message: string
  suggestion?: string
  reasons: string[]
}

export interface SnapSuggestion {
  startTime: string
  endTime: string
  confidence: number
  reason?: string
}