/**
 * Time utilities for consistent time formatting and parsing
 */

export interface ParsedTime {
  hours: number
  minutes: number
}

/**
 * Parse time string in HH:MM format
 */
export function parseTime(timeStr: string): ParsedTime {
  const [hours, minutes] = timeStr.split(':').map(Number)
  return { hours: hours || 0, minutes: minutes || 0 }
}

/**
 * Format time from hours and minutes to HH:MM
 */
export function formatTime(hours: number, minutes: number): string {
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
}

/**
 * Format time from total minutes to HH:MM
 */
export function formatTimeFromMinutes(totalMinutes: number): string {
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  return formatTime(hours, minutes)
}

/**
 * Convert time string to total minutes since midnight
 */
export function timeToMinutes(timeStr: string): number {
  const { hours, minutes } = parseTime(timeStr)
  return hours * 60 + minutes
}

/**
 * Add minutes to a time string
 */
export function addMinutesToTime(timeStr: string, minutesToAdd: number): string {
  const totalMinutes = timeToMinutes(timeStr) + minutesToAdd
  const hours = Math.floor(totalMinutes / 60) % 24 // Handle day overflow
  const minutes = totalMinutes % 60
  return formatTime(hours, minutes)
}

/**
 * Calculate duration between two times in minutes
 */
export function getTimeDuration(startTime: string, endTime: string): number {
  const startMinutes = timeToMinutes(startTime)
  let endMinutes = timeToMinutes(endTime)
  
  // Handle next day scenarios
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60 // Add 24 hours
  }
  
  return endMinutes - startMinutes
}

/**
 * Format duration in minutes to human readable string
 */
export function formatDuration(minutes: number): string {
  if (minutes < 60) {
    return `${minutes}m`
  }
  
  const hours = Math.floor(minutes / 60)
  const remainingMinutes = minutes % 60
  
  if (remainingMinutes === 0) {
    return `${hours}h`
  }
  
  return `${hours}h ${remainingMinutes}m`
}

/**
 * Check if one time is after another
 */
export function isTimeAfter(time1: string, time2: string): boolean {
  return timeToMinutes(time1) > timeToMinutes(time2)
}

/**
 * Check if two time ranges overlap
 */
export function doTimeRangesOverlap(
  start1: string, 
  end1: string, 
  start2: string, 
  end2: string
): boolean {
  const start1Min = timeToMinutes(start1)
  const end1Min = timeToMinutes(end1)
  const start2Min = timeToMinutes(start2)
  const end2Min = timeToMinutes(end2)
  
  return start1Min < end2Min && start2Min < end1Min
}

/**
 * Get current time in HH:MM format
 */
export function getCurrentTime(): string {
  const now = new Date()
  return formatTime(now.getHours(), now.getMinutes())
}