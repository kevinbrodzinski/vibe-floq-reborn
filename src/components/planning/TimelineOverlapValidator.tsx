import { Alert, AlertDescription } from '@/components/ui/alert'
import { AlertTriangle, Clock } from 'lucide-react'

interface Stop {
  id: string
  title: string
  start_time: string
  end_time: string
}

interface TimelineOverlapValidatorProps {
  stops: Stop[]
}

export function TimelineOverlapValidator({ stops }: TimelineOverlapValidatorProps) {
  const findOverlaps = () => {
    const overlaps: Array<{ stop1: Stop; stop2: Stop }> = []
    
    for (let i = 0; i < stops.length; i++) {
      for (let j = i + 1; j < stops.length; j++) {
        const stop1 = stops[i]
        const stop2 = stops[j]
        
        // Check if times overlap
        if (
          (stop1.start_time < stop2.end_time && stop1.end_time > stop2.start_time) ||
          (stop2.start_time < stop1.end_time && stop2.end_time > stop1.start_time)
        ) {
          overlaps.push({ stop1, stop2 })
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
    return null
  }

  return (
    <div className="space-y-2">
      {overlaps.map((overlap, index) => (
        <Alert key={index} variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            <span className="text-sm">
              <strong>{overlap.stop1.title}</strong> 
              ({formatTime(overlap.stop1.start_time)} - {formatTime(overlap.stop1.end_time)}) 
              overlaps with <strong>{overlap.stop2.title}</strong> 
              ({formatTime(overlap.stop2.start_time)} - {formatTime(overlap.stop2.end_time)})
            </span>
          </AlertDescription>
        </Alert>
      ))}
    </div>
  )
}