import type { Database } from '@/integrations/supabase/types';

// Database types
export type PlanStopRow = Database['public']['Tables']['plan_stops']['Row'] & {
  venue?: Database['public']['Tables']['venues']['Row'];
};

// Updated type unions
export type PlanMode = 'draft' | 'finalized' | 'executing' | 'completed' | 'done';
export type FloqParticipantRole = 'creator' | 'admin' | 'member';

// Domain types for UI components
export interface PlanStopUi {
  id: string
  title: string
  venue?: { id: string; name: string; address?: string } | null // venue coerced into an object for map / tracker components
  description?: string
  start_time: string
  end_time: string
  stop_order: number // now required everywhere in UI
  address?: string // Add address for compatibility
  duration_minutes?: number
  estimated_cost_per_person?: number
  location?: unknown // PostGIS geometry field
}

export interface PlanStop {
  id: string
  plan_id?: string
  title: string
  venue: string // Keep as string for compatibility
  description: string
  startTime: string
  endTime: string
  location: string
  vibeMatch: number
  status: 'confirmed' | 'suggested' | 'voted' | 'pending'
  color: string
  duration_minutes?: number
  durationMinutes?: number // For backwards compatibility
  stop_order?: number
  created_by?: string
  createdBy: string
  start_time: string
  end_time: string
  participants: string[]
  votes: { profileId: string; vote: 'yes' | 'no' | 'maybe' }[]
  kind: any // StopKind from theme
  vibe_tag?: any // VibeTag from theme
  address?: string
  estimated_cost_per_person?: number
}

// Enhanced utility function to transform database row to domain object
export function transformPlanStop(dbStop: PlanStopRow): PlanStop {
  const duration = dbStop.start_time && dbStop.end_time 
    ? Math.round((new Date(`1970-01-01T${dbStop.end_time}`).getTime() - new Date(`1970-01-01T${dbStop.start_time}`).getTime()) / (1000 * 60))
    : undefined;

  return {
    id: dbStop.id,
    plan_id: dbStop.plan_id || '',
    title: dbStop.title || '',
    venue: dbStop.venue?.name || '',
    description: dbStop.description || '',
    startTime: dbStop.start_time || '',
    endTime: dbStop.end_time || '',
    location: dbStop.address || '',
    vibeMatch: 0.8,
    status: 'confirmed' as const,
    color: '#3B82F6',
    duration_minutes: duration,
    durationMinutes: duration,
    stop_order: dbStop.stop_order || 0,
    created_by: dbStop.created_by || '',
    createdBy: dbStop.created_by || '',
    start_time: dbStop.start_time || '',
    end_time: dbStop.end_time || '',
    participants: [],
    votes: [],
    kind: 'restaurant' as any,
    vibe_tag: undefined,
    address: dbStop.address || undefined,
    estimated_cost_per_person: dbStop.estimated_cost_per_person || undefined,
  };
}

export interface PlanParticipant {
  id: string
  name: string
  avatar: string
  status: 'confirmed' | 'pending' | 'declined'
  isEditing?: boolean
  lastActivity?: number
  role?: FloqParticipantRole
  checkInStatus?: 'checked-in' | 'checked-out'
}

export interface Plan {
  id: string
  title: string
  date: string
  stops: PlanStop[]
  participants: PlanParticipant[]
  status?: 'draft' | 'finalized' | 'executing' | 'completed' | 'cancelled'
  creator_id?: string
  created_by?: string // Keep for backwards compatibility
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