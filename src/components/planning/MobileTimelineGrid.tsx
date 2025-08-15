
import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Calendar, Users, MapPin } from 'lucide-react'
import { DndContext, DragEndEvent, DragStartEvent, DragOverEvent, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { DraggableStopCard } from './DraggableStopCard'
import { AddStopButton } from '@/components/AddStopButton'
import { useTimelineGridLogic } from '@/hooks/useTimelineGridLogic'
import { useCollaborativeState } from '@/hooks/useCollaborativeState'
import { cn } from '@/lib/utils'
import type { PlanStop } from '@/types/plan'

interface MobileTimelineGridProps {
  planId: string
  planStatus: string
  startTime: string
  endTime: string
  stops: PlanStop[]
  onAddStop: (timeSlot: string) => void
  onStopReorder: (activeId: string, overId: string) => void
  onStopSelect: (stopId: string) => void
}

// Droppable wrapper for time slots
function DroppableTimeSlot({ 
  timeSlot, 
  isDraggedOver, 
  children 
}: { 
  timeSlot: string
  isDraggedOver: boolean
  children: React.ReactNode 
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `timeslot-${timeSlot}`,
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "transition-all duration-200 rounded-lg",
        (isOver || isDraggedOver) && "bg-primary/5 border-2 border-dashed border-primary"
      )}
    >
      {children}
    </div>
  )
}

export function MobileTimelineGrid({
  planId,
  planStatus,
  startTime,
  endTime,
  stops,
  onAddStop,
  onStopReorder,
  onStopSelect
}: MobileTimelineGridProps) {
  const [currentDragStopId, setCurrentDragStopId] = useState<string | undefined>()
  const [dragOverTimeSlot, setDragOverTimeSlot] = useState<string | null>(null)
  
  // Use collaborative state for reordering
  const { reorder } = useCollaborativeState({ planId })

  // Use the timeline grid logic hook
  const timelineStops = useTimelineGridLogic(stops, currentDragStopId, planId)

  // Generate time slots (every 30 minutes)
  const generateTimeSlots = useCallback(() => {
    const slots: string[] = []
    const start = parseInt(startTime.split(':')[0])
    const end = parseInt(endTime.split(':')[0])
    
    for (let hour = start; hour <= end; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`)
      if (hour < end) {
        slots.push(`${hour.toString().padStart(2, '0')}:30`)
      }
    }
    return slots
  }, [startTime, endTime])

  const timeSlots = generateTimeSlots()

  const handleDragStart = (event: DragStartEvent) => {
    setCurrentDragStopId(event.active.id as string)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event
    if (over && typeof over.id === 'string' && over.id.startsWith('timeslot-')) {
      const timeSlot = over.id.replace('timeslot-', '')
      setDragOverTimeSlot(timeSlot)
    } else {
      setDragOverTimeSlot(null)
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    
    setCurrentDragStopId(undefined)
    setDragOverTimeSlot(null)

    if (!over) return

    // Handle reordering between stops
    if (over.id !== active.id && typeof over.id === 'string' && !over.id.startsWith('timeslot-')) {
      const oldIndex = stops.findIndex(s => s.id === active.id)
      const newIndex = stops.findIndex(s => s.id === over.id)
      
      if (oldIndex !== -1 && newIndex !== -1) {
        onStopReorder(active.id as string, over.id as string)
        
        // Also use collaborative state reorder
        const newOrder = [...stops]
        const [movedStop] = newOrder.splice(oldIndex, 1)
        newOrder.splice(newIndex, 0, movedStop)
        reorder(newOrder.map(s => s.id))
      }
    }

    // Handle dropping on time slots (update stop time)
    if (over.id && typeof over.id === 'string' && over.id.startsWith('timeslot-')) {
      const timeSlot = over.id.replace('timeslot-', '')
      const draggedStop = stops.find(s => s.id === active.id)
      
      if (draggedStop) {
        console.log(`🕐 Moving stop "${draggedStop.title}" to time slot ${timeSlot}`)
        // This would trigger a stop time update
        // You'd need to implement a handler for this in the parent component
        // onStopTimeChange?.(active.id as string, timeSlot)
      }
    }
  }

  const handleAddStopClick = (timeSlot: string) => {
    console.log('🔍 MobileTimelineGrid handleAddStopClick called with:', timeSlot)
    onAddStop(timeSlot)
  }

  const handleStopEdit = (stop: any) => {
    console.log('Edit stop:', stop.id)
    onStopSelect(stop.id)
  }

  const handleStopDelete = (stopId: string) => {
    console.log('Delete stop:', stopId)
    // This would need to be connected to a delete handler
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border/10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Clock className="w-5 h-5" />
            Timeline
            {currentDragStopId && (
              <Badge variant="outline" className="text-xs animate-pulse">
                Dragging...
              </Badge>
            )}
          </h2>
          <Badge variant="outline" className="text-xs">
            {stops.length} stops
          </Badge>
        </div>
      </div>

      {/* Timeline Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        <DndContext
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToVerticalAxis]}
          collisionDetection={closestCenter}
        >
          <SortableContext items={stops.map(s => s.id)} strategy={verticalListSortingStrategy}>
            <AnimatePresence>
              {timeSlots.map((timeSlot) => {
                const stopAtTime = timelineStops.find(stop => 
                  stop.start_time?.startsWith(timeSlot) || stop.startTime?.startsWith(timeSlot)
                )
                const isDraggedOver = dragOverTimeSlot === timeSlot

                return (
                  <motion.div
                    key={timeSlot}
                    layout
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    className="space-y-2"
                  >
                    {/* Time Label */}
                    <div className="flex items-center gap-3">
                      <div className="w-20 flex items-center gap-2 text-sm font-medium text-muted-foreground">
                        <Clock className="w-4 h-4" />
                        {timeSlot}
                      </div>
                      
                      <div className="flex-1">
                        <DroppableTimeSlot timeSlot={timeSlot} isDraggedOver={isDraggedOver}>
                          {stopAtTime ? (
                            <DraggableStopCard
                              stop={{
                                id: stopAtTime.id,
                                title: stopAtTime.title,
                                description: stopAtTime.description,
                                start_time: stopAtTime.start_time || stopAtTime.startTime || timeSlot,
                                end_time: stopAtTime.end_time || stopAtTime.endTime || timeSlot,
                                duration_minutes: stopAtTime.duration_minutes,
                                estimated_cost_per_person: stopAtTime.estimated_cost_per_person,
                                venue: typeof stopAtTime.venue === 'string' ? 
                                  { id: stopAtTime.venue, name: stopAtTime.venue } : 
                                  stopAtTime.venue
                              }}
                              planId={planId}
                              onEdit={handleStopEdit}
                              onDelete={handleStopDelete}
                              isDragging={currentDragStopId === stopAtTime.id}
                              showQuickActions={true}
                              compact={false}
                            />
                          ) : (
                            <AddStopButton
                              timeSlot={timeSlot}
                              onAdd={handleAddStopClick}
                              isDragOver={isDraggedOver}
                              disabled={planStatus !== 'draft'}
                              className={cn(
                                "min-h-[60px]",
                                isDraggedOver && "border-primary bg-primary/10"
                              )}
                            />
                          )}
                        </DroppableTimeSlot>
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </SortableContext>
        </DndContext>
      </div>

      {/* Drag Instructions */}
      {currentDragStopId && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-primary/5 border-t border-primary/20"
        >
          <p className="text-sm text-center text-muted-foreground">
            💡 Drag to reorder stops or drop on a time slot to change timing
          </p>
        </motion.div>
      )}
    </div>
  )
}
