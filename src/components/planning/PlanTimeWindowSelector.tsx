import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Clock, Calendar } from 'lucide-react'

interface PlanTimeWindowSelectorProps {
  onConfirm: (startTime: string, endTime: string) => void
  defaultStartTime?: string
  defaultEndTime?: string
}

export function PlanTimeWindowSelector({ 
  onConfirm, 
  defaultStartTime = "18:00",
  defaultEndTime = "23:00" 
}: PlanTimeWindowSelectorProps) {
  const [startTime, setStartTime] = useState(defaultStartTime)
  const [endTime, setEndTime] = useState(defaultEndTime)

  const formatTimeRange = (start: string, end: string) => {
    const formatTime = (timeStr: string) => {
      const [hours, minutes] = timeStr.split(':').map(Number)
      const ampm = hours >= 12 ? 'PM' : 'AM'
      const displayHour = hours % 12 || 12
      return `${displayHour}:${minutes.toString().padStart(2, '0')} ${ampm}`
    }
    
    return `${formatTime(start)} - ${formatTime(end)}`
  }

  const calculateDuration = (start: string, end: string) => {
    const [startHour, startMin] = start.split(':').map(Number)
    const [endHour, endMin] = end.split(':').map(Number)
    
    let totalMinutes = (endHour * 60 + endMin) - (startHour * 60 + startMin)
    
    // Handle next day scenarios (e.g., 10 PM to 2 AM)
    if (totalMinutes <= 0) {
      totalMinutes += 24 * 60
    }
    
    const hours = Math.floor(totalMinutes / 60)
    const minutes = totalMinutes % 60
    
    return minutes > 0 ? `${hours}h ${minutes}m` : `${hours}h`
  }

  const handleConfirm = () => {
    onConfirm(startTime, endTime)
  }

  const duration = calculateDuration(startTime, endTime)

  return (
    <Card className="w-full max-w-md mx-auto">
      <CardHeader className="text-center">
        <CardTitle className="flex items-center justify-center gap-2">
          <Calendar className="h-5 w-5" />
          Set Plan Time Window
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Choose the time range for your plan
        </p>
      </CardHeader>

      <CardContent className="space-y-6">
        {/* Visual time range display */}
        <div className="text-center p-4 bg-muted rounded-lg">
          <div className="text-2xl font-bold text-primary">
            {formatTimeRange(startTime, endTime)}
          </div>
          <div className="text-sm text-muted-foreground mt-1">
            Duration: {duration}
          </div>
        </div>

        {/* Time inputs */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="start-time" className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              Start Time
            </Label>
            <Input
              id="start-time"
              type="time"
              value={startTime}
              onChange={(e) => setStartTime(e.target.value)}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="end-time" className="flex items-center gap-1">
              <Clock className="h-4 w-4" />
              End Time
            </Label>
            <Input
              id="end-time"
              type="time"
              value={endTime}
              onChange={(e) => setEndTime(e.target.value)}
            />
          </div>
        </div>

        {/* Quick preset buttons */}
        <div className="space-y-2">
          <Label className="text-sm">Quick Presets:</Label>
          <div className="grid grid-cols-2 gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStartTime("17:00")
                setEndTime("22:00")
              }}
            >
              Dinner (5h)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStartTime("20:00")
                setEndTime("02:00")
              }}
            >
              Night Out (6h)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStartTime("12:00")
                setEndTime("18:00")
              }}
            >
              Day Trip (6h)
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setStartTime("10:00")
                setEndTime("22:00")
              }}
            >
              Full Day (12h)
            </Button>
          </div>
        </div>

        {/* Confirm button */}
        <Button onClick={handleConfirm} className="w-full">
          Confirm Time Window
        </Button>
      </CardContent>
    </Card>
  )
}