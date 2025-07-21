
import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Calendar, Users, MapPin } from 'lucide-react'
import { DndContext, DragEndEvent, DragStartEvent, DragOverEvent } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { StopCard } from '@/components/StopCard'
import { AddStopButton } from '@/components/AddStopButton'
import { useTimelineGridLogic } from '@/hooks/useTimelineGridLogic'
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
      onStopReorder(active.id as string, over.id as string)
    }
  }

  const handleAddStopClick = (timeSlot: string) => {
    console.log('🔍 MobileTimelineGrid handleAddStopClick called with:', timeSlot)
    onAddStop(timeSlot)
  }

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border/10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Timeline</h2>
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
        >
          <SortableContext items={stops.map(s => s.id)} strategy={verticalListSortingStrategy}>
            <AnimatePresence>
              {timeSlots.map((timeSlot) => {
                const stopAtTime = timelineStops.find(stop => 
                  stop.start_time?.startsWith(timeSlot)
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
                        {stopAtTime ? (
                          <StopCard
                            stop={stopAtTime}
                            isSelected={false}
                            isDragOver={isDraggedOver}
                            onSelect={() => onStopSelect(stopAtTime.id)}
                            onEdit={() => console.log('Edit stop:', stopAtTime.id)}
                            onRemove={() => console.log('Remove stop:', stopAtTime.id)}
                            onVote={() => console.log('Vote on stop:', stopAtTime.id)}
                            onDragStart={() => {}}
                            draggable={planStatus === 'draft'}
                          />
                        ) : (
                          <div
                            id={`timeslot-${timeSlot}`}
                            data-timeslot={timeSlot}
                          >
                            <AddStopButton
                              timeSlot={timeSlot}
                              onAdd={handleAddStopClick}
                              isDragOver={isDraggedOver}
                              disabled={planStatus !== 'draft'}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </SortableContext>
        </DndContext>
      </div>
    </div>
  )
}
