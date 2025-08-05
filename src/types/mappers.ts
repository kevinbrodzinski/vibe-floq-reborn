
import type { PlanStop } from '@/types/plan'
import type { PlanStopRow, DailyAfterglowRow, JsonArray, JsonObject } from '@/types/database'

// Enhanced plan stop mapper
export function mapPlanStopFromDb(row: PlanStopRow): PlanStop {
  const duration = row.start_time && row.end_time 
    ? Math.round((new Date(`1970-01-01T${row.end_time}`).getTime() - new Date(`1970-01-01T${row.start_time}`).getTime()) / (1000 * 60))
    : undefined

  return {
    id: row.id,
    plan_id: row.plan_id || '',
    title: row.title || '',
    venue: row.venue?.name || '',
    description: row.description || '',
    startTime: row.start_time || '',
    endTime: row.end_time || '',
    location: row.address || '',
    vibeMatch: 0.8,
    status: 'confirmed' as const,
    color: '#3B82F6',
    duration_minutes: duration,
    durationMinutes: duration,
    stop_order: row.stop_order || 0,
    created_by: row.created_by || '',
    createdBy: row.created_by || '',
    start_time: row.start_time || '',
    end_time: row.end_time || '',
    participants: [],
    votes: [],
    kind: 'restaurant' as any,
    vibe_tag: undefined,
    address: row.address || undefined,
    estimated_cost_per_person: row.estimated_cost_per_person || undefined,
  }
}

// Daily afterglow mapper
export function mapDailyAfterglowFromDb(row: DailyAfterglowRow) {
  return {
    ...row,
    emotion_journey: Array.isArray(row.emotion_journey) ? row.emotion_journey : [],
    moments: Array.isArray(row.moments) ? row.moments : [],
    vibe_path: Array.isArray(row.vibe_path) ? row.vibe_path : []
  }
}

// JSON field helpers
export function parseJsonArray(value: any): any[] {
  if (Array.isArray(value)) return value
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }
  return []
}

export function parseJsonObject(value: any): JsonObject {
  if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
    return value
  }
  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value)
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed) ? parsed : {}
    } catch {
      return {}
    }
  }
  return {}
}
