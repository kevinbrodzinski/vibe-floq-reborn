import { useState } from 'react'
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCenter,
  DragOverlay,
} from '@dnd-kit/core'
import {
  SortableContext,
  verticalListSortingStrategy,
  arrayMove,
} from '@dnd-kit/sortable'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Plus, Clock, Mic } from 'lucide-react'
import { useSmartTimeSuggestion } from '@/hooks/useSmartTimeSuggestion'
import { useNovaSnap } from '@/hooks/useNovaSnap'
import { useToast } from '@/hooks/use-toast'
import { DraggableStopCard } from './DraggableStopCard'
import { AddStopModal } from './AddStopModal'
import { VoiceInputSheet } from '@/components/VoiceInputSheet'
import { usePlanStops } from '@/hooks/usePlanStops'
import { useUpdatePlanStop } from '@/hooks/useUpdatePlanStop'

interface DraggableTimelineGridProps {
  planId: string
  startTime?: string
  endTime?: string
}

export function DraggableTimelineGrid({ 
  planId, 
  startTime = "18:00", 
  endTime = "23:00" 
}: DraggableTimelineGridProps) {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [selectedTimeSlot, setSelectedTimeSlot] = useState<{ start: string, end: string } | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const [voiceOpen, setVoiceOpen] = useState(false)
  
  const { data: stops = [], isLoading } = usePlanStops(planId)
  const updateStop = useUpdatePlanStop()
  const { toast } = useToast()
  const { recordNovaSnap } = useNovaSnap()
  
  // Nova suggestion for invalid drags
  const novaSuggestion = useSmartTimeSuggestion({
    planStartTime: startTime,
    planEndTime: endTime,
    existingStops: stops,
  })

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  // Generate time slots
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
        id: `slot-${currentTime}`,
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

  const timeSlots = generateTimeSlots()

  // Group stops by time slots
  const getStopsInTimeSlot = (slotStart: string, slotEnd: string) => {
    return stops.filter(stop => {
      return stop.start_time >= slotStart && stop.start_time < slotEnd
    })
  }

  // Find which time slot a time belongs to
  const findTimeSlotForTime = (time: string) => {
    return timeSlots.find(slot => time >= slot.start && time < slot.end)
  }

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }

  const handleDragOver = (event: DragOverEvent) => {
    // Handle drag over different time slots
    const { active, over } = event
    
    if (!over || active.id === over.id) return

    const activeStop = stops.find(stop => stop.id === active.id)
    if (!activeStop) return

    // Check if dragging over a time slot
              const overSlotId = over.id as string
              if (overSlotId.startsWith('slot-')) {
                const slotTime = overSlotId.replace('slot-', '')
                const targetSlot = timeSlots.find(slot => slot.start === slotTime)
      
      if (targetSlot && activeStop.start_time !== targetSlot.start) {
        // Calculate new end time based on duration
        const duration = activeStop.duration_minutes || 60
        const [startHour, startMin] = targetSlot.start.split(':').map(Number)
        const endMinutes = (startHour * 60 + startMin + duration) % (24 * 60)
        const endHour = Math.floor(endMinutes / 60)
        const endMin = endMinutes % 60
        const newEndTime = `${endHour.toString().padStart(2, '0')}:${endMin.toString().padStart(2, '0')}`

        // Update the stop time optimistically
        updateStop.mutate({
          id: activeStop.id,
          plan_id: planId,
          start_time: targetSlot.start,
          end_time: newEndTime,
        })
      }
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveId(null)
    
    const { active, over } = event
    const activeStop = stops.find(stop => stop.id === active.id)
    
    if (!over) {
      // Invalid drag - fallback to Nova suggestion
      if (activeStop && novaSuggestion && novaSuggestion !== activeStop.start_time) {
        toast({
          title: "🪄 Nova Suggestion",
          description: `Try ${novaSuggestion} for better timing?`,
          action: (
            <button
              className="text-sm underline"
              onClick={() => {
                updateStop.mutate({
                  id: activeStop.id,
                  plan_id: planId,
                  start_time: novaSuggestion,
                })
                recordNovaSnap(planId, activeStop.id, 0.8)
              }}
            >
              Apply
            </button>
          )
        })
      }
      return
    }

    // Handle reordering within the same time slot
    const overStop = stops.find(stop => stop.id === over.id)
    
    if (activeStop && overStop && activeStop.id !== overStop.id) {
      const activeSlot = findTimeSlotForTime(activeStop.start_time)
      const overSlot = findTimeSlotForTime(overStop.start_time)
      
        // Only reorder if in the same time slot
        if (activeSlot?.start === overSlot?.start) {
        const slotStops = getStopsInTimeSlot(activeSlot.start, activeSlot.end)
        const oldIndex = slotStops.findIndex(stop => stop.id === activeStop.id)
        const newIndex = slotStops.findIndex(stop => stop.id === overStop.id)
        
        if (oldIndex !== newIndex) {
          const newOrder = arrayMove(slotStops, oldIndex, newIndex)
          
          // Update stop orders
          newOrder.forEach((stop: any, index) => {
            updateStop.mutate({
              id: stop.id,
              plan_id: planId,
              stop_order: index,
            })
          })
        }
      }
    }
  }

  const handleAddStop = (slotStart: string, slotEnd: string) => {
    setSelectedTimeSlot({ start: slotStart, end: slotEnd })
    setIsAddModalOpen(true)
  }

  const activeStop = activeId ? stops.find(stop => stop.id === activeId) : null

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="w-full">
        <div className="flex items-center gap-2 mb-4 text-sm text-muted-foreground">
          <Clock className="h-4 w-4" />
          <span>Timeline: {formatTimeLabel(startTime)} - {formatTimeLabel(endTime)}</span>
          <span className="text-xs">(Drag to reorder and move between time slots)</span>
        </div>

        <ScrollArea className="h-[600px] w-full">
          <div className="space-y-1">
            {timeSlots.map((slot) => {
              const slotStops = getStopsInTimeSlot(slot.start, slot.end)
              const hasStops = slotStops.length > 0
              const stopIds = slotStops.map(stop => stop.id)

              return (
                <div
                  key={slot.id}
                  id={slot.id}
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
                      <SortableContext items={stopIds} strategy={verticalListSortingStrategy}>
                        <div className="space-y-2">
                          {slotStops.map((stop) => (
                            <DraggableStopCard
                              key={stop.id}
                              stop={stop}
                              onEdit={(stop) => console.log('Edit stop:', stop)}
                              onDelete={(stopId) => console.log('Delete stop:', stopId)}
                            />
                          ))}
                        </div>
                      </SortableContext>
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

        {/* Drag overlay */}
        <DragOverlay>
          {activeStop && (
            <DraggableStopCard
              stop={activeStop}
              isDragging={true}
            />
          )}
        </DragOverlay>

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

        {/* Voice Input Floating Action Button */}
        <Button
          size="lg"
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-lg z-50"
          onMouseDown={() => setVoiceOpen(true)}
          onTouchStart={() => setVoiceOpen(true)}
        >
          <Mic className="h-5 w-5" />
        </Button>

        {/* Voice Input Sheet */}
        <VoiceInputSheet
          open={voiceOpen}
          onOpenChange={setVoiceOpen}
          planId={planId}
          planDate={new Date().toISOString().split('T')[0]} // You may want to pass the actual plan date
        />
      </div>
    </DndContext>
  )
}