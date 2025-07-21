import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { DndContext, DragEndEvent, DragOverlay, DragStartEvent, DragOverEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Clock, Users, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { DraggableStopCard } from './DraggableStopCard'
import { StopInteractionPanel } from './StopInteractionPanel'
import { cn } from '@/lib/utils'
import { useDragFeedback } from '@/hooks/useDragFeedback'
import type { PlanStop } from '@/types/plan'

interface MobileTimelineGridProps {
  planId: string
  planStatus: string
  startTime: string
  endTime: string
  stops?: PlanStop[]
  activeParticipants?: any[]
  connectionStatus?: string
  isOptimistic?: boolean
  isDragOperationPending?: boolean
  selectedStopIds?: string[]
  onAddStop?: (timeSlot?: string) => void
  onStopReorder?: (stopId: string, newIndex: number) => void
  onStopSelect?: (stopId: string) => void
}

export function MobileTimelineGrid({
  planId,
  planStatus,
  startTime,
  endTime,
  stops = [],
  activeParticipants = [],
  connectionStatus = 'disconnected',
  isOptimistic = false,
  isDragOperationPending = false,
  selectedStopIds = [],
  onAddStop,
  onStopReorder,
  onStopSelect
}: MobileTimelineGridProps) {
  const [viewMode, setViewMode] = useState<'compact' | 'expanded'>('expanded')
  const [draggedStop, setDraggedStop] = useState<PlanStop | null>(null)
  const [selectedStopId, setSelectedStopId] = useState<string | null>(null)
  const [dragOverTimeSlot, setDragOverTimeSlot] = useState<string | null>(null)
  const dragFeedback = useDragFeedback()
  const scrollContainerRef = useRef<HTMLDivElement>(null)

  // Generate time slots from start to end time
  const generateTimeSlots = () => {
    const slots = []
    const startHour = parseInt(startTime.split(':')[0])
    const endHour = parseInt(endTime.split(':')[0])
    
    for (let hour = startHour; hour <= endHour; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`)
      if (hour < endHour) {
        slots.push(`${hour.toString().padStart(2, '0')}:30`)
      }
    }
    return slots
  }

  const timeSlots = generateTimeSlots()

  const handleDragStart = async (event: DragStartEvent) => {
    const stop = stops?.find(s => s.id === event.active.id)
    if (stop) {
      setDraggedStop(stop)
      await dragFeedback.triggerDragStart()
    }
  }

  const handleDragOver = async (event: DragOverEvent) => {
    // Visual feedback for time slot drop zones
    const timeSlotId = event.over?.id
    if (typeof timeSlotId === 'string' && timeSlotId.startsWith('timeslot-')) {
      const timeSlot = timeSlotId.replace('timeslot-', '')
      setDragOverTimeSlot(timeSlot)
    } else {
      setDragOverTimeSlot(null)
    }
  }

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event
    
    setDraggedStop(null)
    setDragOverTimeSlot(null)
    
    if (!over || !onStopReorder) {
      await dragFeedback.triggerDragEnd(false)
      return
    }

    // Handle reordering
    if (active.id !== over.id) {
      const oldIndex = stops?.findIndex(stop => stop.id === active.id) ?? -1
      const newIndex = stops?.findIndex(stop => stop.id === over.id) ?? -1
      
      if (oldIndex !== -1 && newIndex !== -1) {
        try {
          await onStopReorder(active.id as string, newIndex)
          await dragFeedback.triggerDragEnd(true)
        } catch (error) {
          await dragFeedback.triggerDragEnd(false)
        }
      }
    } else {
      await dragFeedback.triggerDragEnd(true)
    }
  }

  const handleStopSelect = (stopId: string) => {
    setSelectedStopId(selectedStopId === stopId ? null : stopId)
    onStopSelect?.(stopId)
  }

  const getStopAtTime = (timeSlot: string) => {
    return stops?.find(stop => stop.start_time === timeSlot)
  }

  const formatTimeSlot = (timeSlot: string) => {
    const [hours, minutes] = timeSlot.split(':')
    const hour = parseInt(hours)
    const ampm = hour >= 12 ? 'PM' : 'AM'
    const displayHour = hour % 12 || 12
    return `${displayHour}:${minutes} ${ampm}`
  }

  if (viewMode === 'compact') {
    return (
      <div className="p-4 space-y-4">
        {/* View Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-medium">Timeline</span>
            {isDragOperationPending && (
              <Badge variant="secondary" className="text-xs animate-pulse">
                Saving...
              </Badge>
            )}
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setViewMode('expanded')}
          >
            Expand
          </Button>
        </div>

        {/* Compact Stop List */}
        <DndContext 
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={stops?.map(s => s.id) || []} 
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-2">
              {!stops || stops.length === 0 ? (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="text-center py-8"
                >
                  <p className="text-muted-foreground mb-4">No stops planned yet</p>
                  {onAddStop && (
                    <Button onClick={() => onAddStop()} className="gap-2">
                      <Plus className="h-4 w-4" />
                      Add First Stop
                    </Button>
                  )}
                </motion.div>
              ) : (
                <AnimatePresence>
                  {stops.map((stop) => (
                    <motion.div
                      key={stop.id}
                      layout
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -20 }}
                      className="space-y-2"
                    >
                      <DraggableStopCard
                        stop={{
                          ...stop,
                          venue: typeof stop.venue === 'string' 
                            ? { id: 'unknown', name: stop.venue, address: stop.address }
                            : stop.venue
                        }}
                        isDragging={draggedStop?.id === stop.id}
                        onEdit={(stop) => console.log('Edit stop:', stop)}
                        onDelete={(stopId) => console.log('Delete stop:', stopId)}
                      />
                      
                      {selectedStopId === stop.id && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                        >
                          <StopInteractionPanel
                            planId={planId}
                            stopId={stop.id}
                            currentUserId={null} // Will be handled by the component
                          />
                        </motion.div>
                      )}
                    </motion.div>
                  ))}
                </AnimatePresence>
              )}
            </div>
          </SortableContext>

          <DragOverlay>
            {draggedStop && (
              <DraggableStopCard
                stop={{
                  ...draggedStop,
                  venue: typeof draggedStop.venue === 'string' 
                    ? { id: 'unknown', name: draggedStop.venue, address: draggedStop.address }
                    : draggedStop.venue
                }}
                isDragging={true}
                onEdit={() => {}}
                onDelete={() => {}}
              />
            )}
          </DragOverlay>
        </DndContext>
      </div>
    )
  }

  return (
    <div className="p-4 space-y-4">
      {/* View Toggle */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Clock className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm font-medium">Timeline</span>
          <Badge variant="secondary" className="text-xs">
            {stops?.length || 0} stops
          </Badge>
          {isDragOperationPending && (
            <Badge variant="secondary" className="text-xs animate-pulse">
              Saving...
            </Badge>
          )}
        </div>
        <Button
          variant="outline"  
          size="sm"
          onClick={() => setViewMode('compact')}
        >
          Compact
        </Button>
      </div>

      {/* Expanded Timeline Grid */}
      <div 
        ref={scrollContainerRef}
        className="space-y-4"
      >
        <DndContext 
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <SortableContext 
            items={stops?.map(s => s.id) || []} 
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-1">
              {timeSlots.map((timeSlot) => {
                const stop = getStopAtTime(timeSlot)
                
                return (
                  <motion.div
                    key={timeSlot}
                    layout
                    className="grid grid-cols-[80px_1fr] gap-3 items-start py-2"
                  >
                    {/* Time Label */}
                    <div className="text-xs font-medium text-muted-foreground pt-2 text-right">
                      {formatTimeSlot(timeSlot)}
                    </div>
                    
                    {/* Stop or Add Button */}
                    <div className="space-y-2">
                      {stop ? (
                        <motion.div
                          layout
                          initial={{ opacity: 0, scale: 0.95 }}
                          animate={{ opacity: 1, scale: 1 }}
                          className="space-y-2"
                        >
                          <div
                            className={cn(
                              "cursor-pointer transition-all duration-200",
                              selectedStopId === stop.id && "ring-2 ring-primary ring-offset-2 rounded-xl"
                            )}
                            onClick={() => handleStopSelect(stop.id)}
                          >
                            <DraggableStopCard
                              stop={{
                                ...stop,
                                venue: typeof stop.venue === 'string' 
                                  ? { id: 'unknown', name: stop.venue, address: stop.address }
                                  : stop.venue
                              }}
                              isDragging={draggedStop?.id === stop.id}
                              onEdit={(stop) => console.log('Edit stop:', stop)}
                              onDelete={(stopId) => console.log('Delete stop:', stopId)}
                            />
                          </div>
                          
                          {selectedStopId === stop.id && (
                            <motion.div
                              initial={{ opacity: 0, height: 0 }}
                              animate={{ opacity: 1, height: 'auto' }}
                              exit={{ opacity: 0, height: 0 }}
                            >
                              <StopInteractionPanel
                                planId={planId}
                                stopId={stop.id}
                                currentUserId={null}
                              />
                            </motion.div>
                          )}
                        </motion.div>
                      ) : (
                        <div className="relative">
                          <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={() => onAddStop?.(timeSlot)}
                            className="w-full p-4 border-2 border-dashed border-border rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all duration-200 group"
                            disabled={!onAddStop}
                          >
                            <div className="flex items-center justify-center gap-2 text-muted-foreground group-hover:text-primary">
                              <Plus className="h-4 w-4" />
                              <span className="text-sm">Add stop at {formatTimeSlot(timeSlot)}</span>
                            </div>
                          </motion.button>

                          {/* Drop zone indicator */}
                          {dragOverTimeSlot === timeSlot && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              className="absolute inset-0 border-2 border-dashed border-primary bg-primary/5 rounded-xl pointer-events-none"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                )
              })}
            </div>
          </SortableContext>

          <DragOverlay>
            {draggedStop && (
              <DraggableStopCard
                stop={{
                  ...draggedStop,
                  venue: typeof draggedStop.venue === 'string' 
                    ? { id: 'unknown', name: draggedStop.venue, address: draggedStop.address }
                    : draggedStop.venue
                }}
                isDragging={true}
                onEdit={() => {}}
                onDelete={() => {}}
              />
            )}
          </DragOverlay>
        </DndContext>
      </div>
    </div>
  )
}