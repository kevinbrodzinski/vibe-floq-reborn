import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { RadialSlider } from '@/components/plans/RadialSlider'
import { Badge } from '@/components/ui/badge'
import { Clock } from 'lucide-react'
import { format } from 'date-fns'

interface TimeRange {
  start: string
  end: string
}

interface Props {
  initialRange: TimeRange
  initialDuration: 4 | 6 | 8 | 12
  onChange: (range: TimeRange, duration: 4 | 6 | 8 | 12) => void
  onNext: () => void
}

export function TimeDialStep({ initialRange, initialDuration, onChange, onNext }: Props) {
  const [range, setRange] = useState(initialRange)
  const [duration, setDuration] = useState(initialDuration)

  const durationOptions: Array<4 | 6 | 8 | 12> = [4, 6, 8, 12]

  const handleRangeChange = (newRange: TimeRange) => {
    setRange(newRange)
    onChange(newRange, duration)
  }

  const handleDurationChange = (newDuration: 4 | 6 | 8 | 12) => {
    setDuration(newDuration)
    // Calculate new end time based on start + duration
    const [startHour, startMin] = range.start.split(':').map(Number)
    const startMinutes = startHour * 60 + startMin
    const endMinutes = (startMinutes + newDuration * 60) % (24 * 60)
    const endHour = Math.floor(endMinutes / 60)
    const endMin = endMinutes % 60
    const end = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`
    
    const newRange = { start: range.start, end }
    setRange(newRange)
    onChange(newRange, newDuration)
  }

  const formatTime = (time: string) => {
    const [hours, minutes] = time.split(':').map(Number)
    const date = new Date()
    date.setHours(hours, minutes, 0, 0)
    return format(date, 'h:mm a')
  }

  const handleNext = () => {
    onChange(range, duration)
    onNext()
  }

  return (
    <div className="flex flex-col items-center space-y-8">
      {/* Duration Selector */}
      <div className="space-y-3 w-full">
        <h3 className="text-lg font-medium text-center">Plan Duration</h3>
        <div className="flex gap-2 justify-center flex-wrap">
          {durationOptions.map((hours) => (
            <Badge
              key={hours}
              variant={duration === hours ? "default" : "outline"}
              className="cursor-pointer px-4 py-2 text-sm"
              onClick={() => handleDurationChange(hours)}
            >
              {hours}h
            </Badge>
          ))}
        </div>
      </div>

      {/* Radial Slider */}
      <div className="space-y-4">
        <RadialSlider
          startTime={range.start}
          durationHours={duration}
          onChange={handleRangeChange}
          size={280}
        />
      </div>

      {/* Time Display */}
      <div className="text-center space-y-2">
        <div className="flex items-center justify-center gap-2 text-lg font-medium">
          <Clock className="w-5 h-5" />
          <span>{formatTime(range.start)} — {formatTime(range.end)}</span>
        </div>
        <p className="text-muted-foreground text-sm">
          {duration} hour planning window
        </p>
      </div>

      {/* Next Button */}
      <Button onClick={handleNext} className="w-full" size="lg">
        Continue to Details
      </Button>
    </div>
  )
}