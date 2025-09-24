import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, Clock, CheckCircle } from 'lucide-react'
import { PlanStop } from '@/types/plan'

interface TimelineOverlapValidatorProps {
  stops: PlanStop[]
  showResolutions?: boolean
  onResolveOverlap?: (stop1Id: string, stop2Id: string, resolution: 'adjust' | 'merge' | 'split') => void
}

export function TimelineOverlapValidator({ 
  stops, 
  showResolutions = false, 
  onResolveOverlap 
}: TimelineOverlapValidatorProps) {
  
  const parseTime = (timeStr: string): number => {
    const [hours, minutes] = timeStr.split(':').map(Number)
    return hours * 60 + minutes
  }
  
  const formatTimeFromMinutes = (minutes: number): string => {
    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60
    return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`
  }
  
  const findOverlaps = () => {
    const overlaps: Array<{ 
      stop1: PlanStop; 
      stop2: PlanStop; 
      overlapMinutes: number;
      severity: 'minor' | 'major' | 'critical'
    }> = []
    
    for (let i = 0; i < stops.length; i++) {
      for (let j = i + 1; j < stops.length; j++) {
        const stop1 = stops[i]
        const stop2 = stops[j]
        
        const start1 = parseTime(stop1.startTime)
        const end1 = parseTime(stop1.endTime)
        const start2 = parseTime(stop2.startTime)
        const end2 = parseTime(stop2.endTime)
        
        // Handle cross-midnight scenarios
        const adjustedEnd1 = end1 < start1 ? end1 + 1440 : end1
        const adjustedEnd2 = end2 < start2 ? end2 + 1440 : end2
        
        // Check for overlap using proper time comparison
        const overlapStart = Math.max(start1, start2)
        const overlapEnd = Math.min(adjustedEnd1, adjustedEnd2)
        
        if (overlapStart < overlapEnd) {
          const overlapMinutes = overlapEnd - overlapStart
          let severity: 'minor' | 'major' | 'critical' = 'minor'
          
          if (overlapMinutes > 120) severity = 'critical'
          else if (overlapMinutes > 60) severity = 'major'
          
          overlaps.push({ stop1, stop2, overlapMinutes, severity })
        }
      }
    }
    
    return overlaps
  }

  const formatTime = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  const overlaps = findOverlaps()

  if (overlaps.length === 0) {
    return (
      <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400 p-3 bg-green-50/50 dark:bg-green-900/20 rounded-xl border border-green-200/30 dark:border-green-800/30">
        <CheckCircle className="h-4 w-4" />
        <span>No time conflicts detected</span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {overlaps.map((overlap, index) => (
        <Alert 
          key={index} 
          variant={overlap.severity === 'critical' ? 'destructive' : 'default'}
          className={`${
            overlap.severity === 'minor' ? 'border-orange-200 dark:border-orange-800' :
            overlap.severity === 'major' ? 'border-red-200 dark:border-red-800' : ''
          }`}
        >
          <AlertTriangle className={`h-4 w-4 ${
            overlap.severity === 'minor' ? 'text-orange-500' :
            overlap.severity === 'major' ? 'text-red-500' :
            'text-destructive'
          }`} />
          <AlertDescription>
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-1">
                <Clock className="h-3 w-3" />
                <span className="text-sm">
                  <strong>{overlap.stop1.title}</strong> 
                  ({formatTime(overlap.stop1.startTime)} - {formatTime(overlap.stop1.endTime)}) 
                  overlaps with <strong>{overlap.stop2.title}</strong> 
                  ({formatTime(overlap.stop2.startTime)} - {formatTime(overlap.stop2.endTime)})
                  <div className="text-xs text-muted-foreground mt-1">
                    {overlap.overlapMinutes} minutes conflict • {overlap.severity} severity
                  </div>
                </span>
              </div>
              
              {showResolutions && onResolveOverlap && (
                <div className="flex gap-1 ml-2">
                  <button
                    onClick={() => onResolveOverlap(overlap.stop1.id, overlap.stop2.id, 'adjust')}
                    className="text-xs px-2 py-1 bg-primary/10 text-primary rounded hover:bg-primary/20 transition-colors"
                  >
                    Auto-adjust
                  </button>
                  <button
                    onClick={() => onResolveOverlap(overlap.stop1.id, overlap.stop2.id, 'split')}
                    className="text-xs px-2 py-1 bg-secondary/10 text-secondary-foreground rounded hover:bg-secondary/20 transition-colors"
                  >
                    Split time
                  </button>
                </div>
              )}
            </div>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  )
}