import type { PlanStop, ConflictInfo } from '@/types/plan'

// Check if two stops overlap in time
export function isOverlapping(stop1: PlanStop, stops: PlanStop[]): boolean {
  const start1 = timeToMinutes(stop1.start_time || stop1.startTime)
  const end1 = timeToMinutes(stop1.end_time || stop1.endTime)
  
  return stops.some(stop2 => {
    if (stop1.id === stop2.id) return false
    
    const start2 = timeToMinutes(stop2.start_time || stop2.startTime)
    const end2 = timeToMinutes(stop2.end_time || stop2.endTime)
    
    return start1 < end2 && end1 > start2
  })
}

// Check for conflicts across all stops
export function checkStopConflicts(stops: PlanStop[]): Set<string> {
  const conflictingIds = new Set<string>()
  
  for (let i = 0; i < stops.length; i++) {
    for (let j = i + 1; j < stops.length; j++) {
      if (isOverlapping(stops[i], [stops[j]])) {
        conflictingIds.add(stops[i].id)
        conflictingIds.add(stops[j].id)
      }
    }
  }
  
  return conflictingIds
}

// Resolve conflicts for a specific stop
export function resolveConflictForStop(
  stopId: string,
  stops: PlanStop[],
  newStartTime: string,
  newDuration?: number
): { success: boolean; newStartTime: string; newDuration: number; message: string } {
  const stop = stops.find(s => s.id === stopId)
  if (!stop) {
    return {
      success: false,
      newStartTime,
      newDuration: newDuration || 60,
      message: 'Stop not found'
    }
  }
  
  const duration = newDuration || stop.duration_minutes || 60
  const endTime = addMinutesToTime(newStartTime, duration)
  
  // Check if new timing resolves conflicts
  const otherStops = stops.filter(s => s.id !== stopId)
  const testStop = { ...stop, start_time: newStartTime, end_time: endTime }
  
  if (!isOverlapping(testStop, otherStops)) {
    return {
      success: true,
      newStartTime,
      newDuration: duration,
      message: 'Conflict resolved successfully'
    }
  }
  
  return {
    success: false,
    newStartTime,
    newDuration: duration,
    message: 'New timing still has conflicts'
  }
}

// Generate detailed conflict information
export function generateConflictDetails(stops: PlanStop[]): ConflictInfo[] {
  const conflictingIds = checkStopConflicts(stops)
  const conflictDetails: ConflictInfo[] = []

  conflictingIds.forEach(stopId => {
    const stop = stops.find(s => s.id === stopId)
    if (!stop) return

    const conflictsWith = stops
      .filter(other => other.id !== stopId && isOverlapping(stop, [other]))
      .map(other => other.id)

    if (conflictsWith.length > 0) {
      const conflictStops = stops.filter(s => conflictsWith.includes(s.id))
      
      conflictDetails.push({
        stopId,
        conflictsWith,
        type: 'time_overlap',
        severity: conflictsWith.length > 1 ? 'high' : 'medium',
        message: `${stop.title} overlaps with ${conflictsWith.length} other stop${conflictsWith.length > 1 ? 's' : ''}`,
        suggestion: 'Adjust the timing or duration to resolve the conflict',
        reasons: conflictStops.map(cs => `Overlaps with ${cs.title} (${cs.start_time || cs.startTime} - ${cs.end_time || cs.endTime})`)
      })
    }
  })

  return conflictDetails
}

// Calculate conflict severity score
export function conflictSeverityScale(stop: PlanStop, conflicts: ConflictInfo[]): number {
  const conflict = conflicts.find(c => c.stopId === stop.id)
  if (!conflict) return 0
  
  switch (conflict.severity) {
    case 'high': return 1.0
    case 'medium': return 0.6
    case 'low': return 0.3
    default: return 0
  }
}

// Utility functions
function timeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return hours * 60 + minutes
}

function addMinutesToTime(time: string, minutes: number): string {
  const totalMinutes = timeToMinutes(time) + minutes
  const hours = Math.floor(totalMinutes / 60)
  const mins = totalMinutes % 60
  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
}