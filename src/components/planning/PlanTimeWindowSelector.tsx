import { useState } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Clock } from 'lucide-react'

interface PlanTimeWindowSelectorProps {
  onConfirm: (startTime: string, endTime: string) => void
  initialStart?: number
  initialDuration?: number
}

export function PlanTimeWindowSelector({
  onConfirm,
  initialStart = 18,
  initialDuration = 6
}: PlanTimeWindowSelectorProps) {
  const [startHour, setStartHour] = useState(initialStart)
  const [duration, setDuration] = useState(initialDuration)

  const endHour = (startHour + duration) % 24

  const formatTime = (hour: number) => {
    const date = new Date()
    date.setHours(hour, 0, 0, 0)
    return date.toLocaleTimeString([], { 
      hour: 'numeric', 
      hour12: true 
    })
  }

  const handleConfirm = () => {
    const startTime = `${startHour.toString().padStart(2, '0')}:00`
    const endTime = `${endHour.toString().padStart(2, '0')}:00`
    onConfirm(startTime, endTime)
  }

  return (
    <div className="flex flex-col items-center gap-6 p-6">
      <div className="text-center">
        <div className="flex items-center justify-center gap-2 mb-2">
          <Clock className="w-5 h-5 text-primary" />
          <h2 className="text-xl font-semibold">Set Your Plan Window</h2>
        </div>
        <p className="text-muted-foreground text-sm">
          Choose when your plan starts and how long it runs
        </p>
      </div>

      {/* Circular Time Selector */}
      <div className="relative w-[240px] h-[240px]">
        <svg 
          className="w-full h-full" 
          viewBox="0 0 240 240"
        >
          {/* Clock face */}
          <circle
            cx="120"
            cy="120"
            r="100"
            fill="none"
            stroke="hsl(var(--border))"
            strokeWidth="2"
          />
          
          {/* Hour markers */}
          {Array.from({ length: 24 }, (_, i) => {
            const angle = (i * 15) - 90 // -90 to start at top
            const radian = (angle * Math.PI) / 180
            const x1 = 120 + 90 * Math.cos(radian)
            const y1 = 120 + 90 * Math.sin(radian)
            const x2 = 120 + 100 * Math.cos(radian)
            const y2 = 120 + 100 * Math.sin(radian)
            
            return (
              <g key={i}>
                <line
                  x1={x1}
                  y1={y1}
                  x2={x2}
                  y2={y2}
                  stroke="hsl(var(--muted-foreground))"
                  strokeWidth={i % 6 === 0 ? "3" : "1"}
                />
                {i % 6 === 0 && (
                  <text
                    x={120 + 80 * Math.cos(radian)}
                    y={120 + 80 * Math.sin(radian)}
                    textAnchor="middle"
                    dominantBaseline="central"
                    className="text-xs fill-muted-foreground"
                  >
                    {i === 0 ? '12AM' : i < 12 ? i : i === 12 ? '12PM' : i - 12}
                  </text>
                )}
              </g>
            )
          })}
          
          {/* Duration arc */}
          <path
            d={`M ${120 + 85 * Math.cos(((startHour * 15) - 90) * Math.PI / 180)} ${120 + 85 * Math.sin(((startHour * 15) - 90) * Math.PI / 180)} A 85 85 0 ${duration > 12 ? 1 : 0} 1 ${120 + 85 * Math.cos(((endHour * 15) - 90) * Math.PI / 180)} ${120 + 85 * Math.sin(((endHour * 15) - 90) * Math.PI / 180)}`}
            fill="none"
            stroke="hsl(var(--primary))"
            strokeWidth="4"
            strokeLinecap="round"
          />
        </svg>

        {/* Center display */}
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center bg-background rounded-xl p-4 border shadow-lg">
            <div className="text-lg font-bold text-primary">
              {formatTime(startHour)} – {formatTime(endHour)}
            </div>
            <div className="text-sm text-muted-foreground">
              {duration} hours
            </div>
          </div>
        </div>
      </div>

      {/* Controls */}
      <div className="space-y-4 w-full max-w-sm">
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Start Time: {formatTime(startHour)}
          </label>
          <input
            type="range"
            min="0"
            max="23"
            value={startHour}
            onChange={(e) => setStartHour(parseInt(e.target.value))}
            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
          />
        </div>
        
        <div>
          <label className="text-sm font-medium text-foreground mb-2 block">
            Duration: {duration} hours
          </label>
          <input
            type="range"
            min="2"
            max="12"
            value={duration}
            onChange={(e) => setDuration(parseInt(e.target.value))}
            className="w-full h-2 bg-muted rounded-lg appearance-none cursor-pointer"
          />
        </div>
      </div>

      <Button 
        onClick={handleConfirm}
        size="lg"
        className="w-full max-w-sm"
      >
        Confirm Time Window
      </Button>
    </div>
  )
}