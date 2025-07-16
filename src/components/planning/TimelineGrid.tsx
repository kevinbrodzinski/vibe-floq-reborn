import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, Clock } from 'lucide-react'
import { StopCard } from './StopCard'
import { AddStopModal } from './AddStopModal'
import { usePlanStops } from '@/hooks/usePlanStops'

interface TimelineGridProps {
  planId: string
  startTime?: string  // e.g., "18:00"
  endTime?: string    // e.g., "23:00"
}

export function TimelineGrid({ 
  planId, 
  startTime = "18:00", 
  endTime = "23:00" 
}: TimelineGridProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ start: string, end: string } | null>(null)
  
  const { data: stops = [], isLoading } = usePlanStops(planId)

  // Generate time slots based on start and end time
  const generateTimeSlots = () => {
    const slots = []
    const [startHour, startMin] = startTime.split(':').map(Number)
    const [endHour, endMin] = endTime.split(':').map(Number)
    
    let currentHour = startHour
    let currentMin = startMin
    
    while (currentHour < endHour || (currentHour === endHour && currentMin < endMin)) {
      const nextHour = currentMin === 30 ? currentHour + 1 : currentHour
      const nextMin = currentMin === 30 ? 0 : currentMin + 30
      
      const currentTime = `${currentHour.toString().padStart(2, '0')}:${currentMin.toString().padStart(2, '0')}`
      const nextTime = `${nextHour.toString().padStart(2, '0')}:${nextMin.toString().padStart(2, '0')}`
      
      slots.push({
        start: currentTime,
        end: nextTime,
        label: formatTimeLabel(currentTime)
      })
      
      currentHour = nextHour
      currentMin = nextMin
    }
    
    return slots
  }

  const formatTimeLabel = (timeStr: string) => {
    const [hours, minutes] = timeStr.split(':').map(Number)
    const ampm = hours >= 12 ? 'PM' : 'AM'
    const displayHour = hours % 12 || 12
    return `${displayHour}:${minutes.toString().padStart(2, '0')} ${ampm}`
  }

  const getStopsInTimeSlot = (slotStart: string, slotEnd: string) => {
    return stops.filter(stop => {
      return stop.start_time >= slotStart && stop.start_time < slotEnd
    })
  }

  const handleAddStop = (slotStart: string, slotEnd: string) => {
    setSelectedTimeSlot({ start: slotStart, end: slotEnd })
    setIsAddModalOpen(true)
  }

  const timeSlots = generateTimeSlots()

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <div className="w-full">
      <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span>Timeline: {formatTimeLabel(startTime)} - {formatTimeLabel(endTime)}</span>
      </div>

      <ScrollArea className="h-[600px] w-full">
        <div className="space-y-1">
          {timeSlots.map((slot, index) => {
            const slotStops = getStopsInTimeSlot(slot.start, slot.end)
            const hasStops = slotStops.length > 0

            return (
              <div
                key={index}
                className={`relative border rounded-lg p-3 transition-colors ${
                  hasStops 
                    ? 'bg-card border-border' 
                    : 'bg-muted/30 border-dashed border-muted-foreground/30 hover:bg-muted/50'
                }`}
                style={{ minHeight: '80px' }}
              >
                {/* Time label */}
                <div className="absolute top-2 left-3 text-xs font-medium text-muted-foreground">
                  {slot.label}
                </div>

                {/* Content area */}
                <div className="mt-6">
                  {hasStops ? (
                    <div className="space-y-2">
                      {slotStops.map((stop) => (
                        <StopCard
                          key={stop.id}
                          stop={stop}
                          // TODO: Add edit and delete handlers
                          onEdit={(stop) => console.log('Edit stop:', stop)}
                          onDelete={(stopId) => console.log('Delete stop:', stopId)}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="flex items-center justify-center h-12">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleAddStop(slot.start, slot.end)}
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Stop
                      </Button>
                    </div>
                  )}
                </div>

                {/* Add another stop button for filled slots */}
                {hasStops && (
                  <div className="mt-2 flex justify-center">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleAddStop(slot.start, slot.end)}
                      className="text-xs"
                    >
                      <Plus className="h-3 w-3 mr-1" />
                      Add Another
                    </Button>
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </ScrollArea>

      {/* Add Stop Modal */}
      <AddStopModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false)
          setSelectedTimeSlot(null)
        }}
        planId={planId}
        defaultStartTime={selectedTimeSlot?.start}
        defaultEndTime={selectedTimeSlot?.end}
      />
    </div>
  )
}