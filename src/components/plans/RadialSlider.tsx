import { useState, useRef, useCallback, useMemo } from 'react'
import { cn } from '@/lib/utils'

interface TimeRange {
  start: string
  end: string
}

interface Props {
  startTime: string
  durationHours?: 4 | 6 | 8 | 12
  onChange: (range: TimeRange) => void
  className?: string
  size?: number
}

export function RadialSlider({ 
  startTime, 
  durationHours = 6, 
  onChange, 
  className, 
  size = 280 
}: Props) {
  const svgRef = useRef<SVGSVGElement>(null)
  const [isDragging, setIsDragging] = useState(false)
  const [currentAngle, setCurrentAngle] = useState(() => timeToAngle(startTime))

  const radius = size / 2 - 24
  const center = size / 2
  const knobRadius = 10

  // Convert time to angle (0° = 12:00, clockwise)
  function timeToAngle(time: string): number {
    const [hours, minutes] = time.split(':').map(Number)
    const totalMinutes = hours * 60 + minutes
    return (totalMinutes / (24 * 60)) * 360
  }

  // Convert angle to time
  function angleToTime(angle: number): string {
    const normalizedAngle = ((angle % 360) + 360) % 360
    const totalMinutes = Math.round((normalizedAngle / 360) * (24 * 60))
    const snappedMinutes = Math.round(totalMinutes / 15) * 15 // Snap to 15-minute intervals
    const hours = Math.floor(snappedMinutes / 60) % 24
    const minutes = snappedMinutes % 60
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`
  }

  // Calculate end time based on start + duration
  const endTime = useMemo(() => {
    const [startHours, startMinutes] = startTime.split(':').map(Number)
    const startTotalMinutes = startHours * 60 + startMinutes
    const endTotalMinutes = (startTotalMinutes + durationHours * 60) % (24 * 60)
    const endHours = Math.floor(endTotalMinutes / 60)
    const endMins = endTotalMinutes % 60
    return `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`
  }, [startTime, durationHours])

  // Calculate arc path
  const arcPath = useMemo(() => {
    const startAngle = currentAngle
    const endAngle = startAngle + (durationHours / 24) * 360
    const startRad = (startAngle - 90) * Math.PI / 180
    const endRad = (endAngle - 90) * Math.PI / 180
    
    const x1 = center + radius * Math.cos(startRad)
    const y1 = center + radius * Math.sin(startRad)
    const x2 = center + radius * Math.cos(endRad)
    const y2 = center + radius * Math.sin(endRad)
    
    const largeArcFlag = (endAngle - startAngle) % 360 > 180 ? 1 : 0
    
    return `M ${x1} ${y1} A ${radius} ${radius} 0 ${largeArcFlag} 1 ${x2} ${y2}`
  }, [currentAngle, durationHours, center, radius])

  // Get knob position
  const knobPosition = useMemo(() => {
    const rad = (currentAngle - 90) * Math.PI / 180
    return {
      x: center + radius * Math.cos(rad),
      y: center + radius * Math.sin(rad)
    }
  }, [currentAngle, center, radius])

  // Get color based on time of day
  const getTimeColor = useCallback((angle: number) => {
    const hour = (angle / 15) % 24 // 360° / 24h = 15° per hour
    
    if (hour >= 6 && hour < 12) {
      // Morning: yellow to light blue
      const progress = (hour - 6) / 6
      return `hsl(${50 - progress * 30} 80% 60%)`
    } else if (hour >= 12 && hour < 18) {
      // Afternoon: light blue to orange
      const progress = (hour - 12) / 6
      return `hsl(${20 + progress * 20} 85% 65%)`
    } else if (hour >= 18 && hour < 24) {
      // Evening: orange to deep blue
      const progress = (hour - 18) / 6
      return `hsl(${240 + progress * 20} 70% ${50 - progress * 20}%)`
    } else {
      // Night: deep blue to yellow
      const progress = hour / 6
      return `hsl(${260 - progress * 210} 70% ${30 + progress * 30}%)`
    }
  }, [])

  const currentColor = getTimeColor(currentAngle)

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    if (!svgRef.current) return
    
    setIsDragging(true)
    svgRef.current.setPointerCapture(e.pointerId)
    
    const handleMove = (e: PointerEvent) => {
      if (!svgRef.current) return
      
      const rect = svgRef.current.getBoundingClientRect()
      const centerX = rect.left + rect.width / 2
      const centerY = rect.top + rect.height / 2
      
      const dx = e.clientX - centerX
      const dy = e.clientY - centerY
      const angle = Math.atan2(dy, dx) * 180 / Math.PI + 90
      const normalizedAngle = ((angle % 360) + 360) % 360
      
      setCurrentAngle(normalizedAngle)
      
      const newStartTime = angleToTime(normalizedAngle)
      const [startHours, startMinutes] = newStartTime.split(':').map(Number)
      const startTotalMinutes = startHours * 60 + startMinutes
      const endTotalMinutes = (startTotalMinutes + durationHours * 60) % (24 * 60)
      const endHours = Math.floor(endTotalMinutes / 60)
      const endMins = endTotalMinutes % 60
      const newEndTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`
      
      onChange({ start: newStartTime, end: newEndTime })
    }
    
    const handleUp = () => {
      setIsDragging(false)
      if (svgRef.current) {
        svgRef.current.releasePointerCapture(e.pointerId)
      }
      window.removeEventListener('pointermove', handleMove)
      window.removeEventListener('pointerup', handleUp)
    }
    
    window.addEventListener('pointermove', handleMove)
    window.addEventListener('pointerup', handleUp)
  }, [durationHours, onChange])

  return (
    <div className={cn('flex items-center justify-center', className)}>
      <svg
        ref={svgRef}
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="touch-none select-none cursor-pointer"
        onPointerDown={handlePointerDown}
      >
        {/* Background track */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          stroke="hsl(var(--border))"
          strokeWidth="12"
          fill="none"
          opacity="0.3"
        />
        
        {/* Active arc */}
        <path
          d={arcPath}
          stroke={currentColor}
          strokeWidth="12"
          fill="none"
          strokeLinecap="round"
          style={{
            filter: 'drop-shadow(0 2px 4px rgba(0,0,0,0.1))'
          }}
        />
        
        {/* Hour markers */}
        {Array.from({ length: 24 }, (_, i) => {
          const angle = (i * 15) - 90 // 15° per hour, -90 to start at 12
          const rad = angle * Math.PI / 180
          const innerRadius = radius - 20
          const outerRadius = radius - 8
          const x1 = center + innerRadius * Math.cos(rad)
          const y1 = center + innerRadius * Math.sin(rad)
          const x2 = center + outerRadius * Math.cos(rad)
          const y2 = center + outerRadius * Math.sin(rad)
          
          return (
            <line
              key={i}
              x1={x1}
              y1={y1}
              x2={x2}
              y2={y2}
              stroke="hsl(var(--muted-foreground))"
              strokeWidth={i % 6 === 0 ? "2" : "1"}
              opacity={i % 6 === 0 ? "0.8" : "0.4"}
            />
          )
        })}
        
        {/* Center dot */}
        <circle
          cx={center}
          cy={center}
          r="4"
          fill="hsl(var(--foreground))"
          opacity="0.5"
        />
        
        {/* Knob */}
        <circle
          cx={knobPosition.x}
          cy={knobPosition.y}
          r={knobRadius}
          fill={currentColor}
          stroke="white"
          strokeWidth="2"
          style={{
            filter: 'drop-shadow(0 2px 8px rgba(0,0,0,0.2))',
            cursor: 'grab',
            ...(isDragging && { cursor: 'grabbing' })
          }}
        />
      </svg>
    </div>
  )
}