
import React, { useState, useCallback, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Clock, Calendar, Users, MapPin, ChevronUp, ChevronDown, Maximize2, Minimize2, AlertTriangle, CheckCircle } from 'lucide-react'
import { DndContext, DragEndEvent, DragStartEvent, DragOverEvent, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { useDroppable } from '@dnd-kit/core'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { DraggableStopCard } from './DraggableStopCard'
import { AddStopButton } from '@/components/AddStopButton'
import { useTimelineGridLogic } from '@/hooks/useTimelineGridLogic'
import { useCollaborativeState } from '@/hooks/useCollaborativeState'
import { useStopTimeUpdate, useSmartTimeSlotSuggestion } from '@/hooks/useStopTimeUpdate'
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
  planDate?: string
  className?: string
}

// Droppable wrapper for time slots
function DroppableTimeSlot({ 
  timeSlot, 
  isDraggedOver, 
  children,
  isEmpty,
  hasConflict,
  conflictSeverity
}: { 
  timeSlot: string
  isDraggedOver: boolean
  children: React.ReactNode
  isEmpty: boolean
  hasConflict?: boolean
  conflictSeverity?: 'low' | 'medium' | 'high'
}) {
  const { isOver, setNodeRef } = useDroppable({
    id: `timeslot-${timeSlot}`,
  })

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "transition-all duration-200 rounded-lg",
        (isOver || isDraggedOver) && !hasConflict && "bg-primary/5 border-2 border-dashed border-primary",
        (isOver || isDraggedOver) && hasConflict && conflictSeverity === 'high' && "bg-destructive/10 border-2 border-dashed border-destructive",
        (isOver || isDraggedOver) && hasConflict && conflictSeverity === 'medium' && "bg-yellow-500/10 border-2 border-dashed border-yellow-500",
        (isOver || isDraggedOver) && hasConflict && conflictSeverity === 'low' && "bg-orange-500/10 border-2 border-dashed border-orange-500",
        isEmpty && "min-h-[60px]" // Only add min-height for empty slots
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
  onStopSelect,
  planDate,
  className
}: MobileTimelineGridProps) {
  const [currentDragStopId, setCurrentDragStopId] = useState<string | undefined>()
  const [dragOverTimeSlot, setDragOverTimeSlot] = useState<string | null>(null)
  const [isExpanded, setIsExpanded] = useState(false)
  const [showEmptySlots, setShowEmptySlots] = useState(false)
  const [pendingTimeUpdate, setPendingTimeUpdate] = useState<{
    stopId: string
    timeSlot: string
    conflicts: any[]
    alternatives: string[]
  } | null>(null)
  
  // Use collaborative state for reordering
  const { reorder } = useCollaborativeState({ planId })

  // Use the timeline grid logic hook
  const timelineStops = useTimelineGridLogic(stops, currentDragStopId, planId)

  // Time update hooks
  const stopTimeUpdate = useStopTimeUpdate()
  const smartTimeSlotSuggestion = useSmartTimeSlotSuggestion(planId)

  // Generate time slots (every 30 minutes) - optimized for mobile
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

  const allTimeSlots = generateTimeSlots()

  // Filter time slots based on view mode
  const displayedTimeSlots = useMemo(() => {
    if (showEmptySlots || isExpanded) {
      return allTimeSlots
    }
    
    // Only show slots that have stops or are adjacent to stops
    const slotsWithStops = allTimeSlots.filter(slot => {
      return timelineStops.some(stop => 
        stop.start_time?.startsWith(slot) || stop.startTime?.startsWith(slot)
      )
    })
    
    // If no stops, show a few slots for adding
    if (slotsWithStops.length === 0) {
      return allTimeSlots.slice(0, 3)
    }
    
    return slotsWithStops
  }, [allTimeSlots, timelineStops, showEmptySlots, isExpanded])

  // Check for conflicts when dragging
  const timeSlotConflicts = useMemo(() => {
    if (!currentDragStopId) return {}
    
    const draggedStop = stops.find(s => s.id === currentDragStopId)
    if (!draggedStop) return {}
    
    const conflicts: Record<string, { severity: 'low' | 'medium' | 'high', conflicts: any[] }> = {}
    
    allTimeSlots.forEach(timeSlot => {
      const existingStop = timelineStops.find(stop => 
        stop.start_time?.startsWith(timeSlot) || stop.startTime?.startsWith(timeSlot)
      )
      
      if (existingStop && existingStop.id !== currentDragStopId) {
        conflicts[timeSlot] = {
          severity: 'high',
          conflicts: [existingStop]
        }
      }
    })
    
    return conflicts
  }, [currentDragStopId, stops, allTimeSlots, timelineStops])

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

  const handleDragEnd = async (event: DragEndEvent) => {
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
        console.log(`🕐 Checking conflicts for moving "${draggedStop.title}" to ${timeSlot}`)
        
        // Check for conflicts using smart time slot suggestion
        try {
          const suggestion = await smartTimeSlotSuggestion.mutateAsync({
            requestedTime: timeSlot,
            stopDuration: draggedStop.duration_minutes || 60,
            planDate
          })
          
          if (suggestion.isOptimal) {
            // No conflicts, proceed with update
            await stopTimeUpdate.mutateAsync({
              stopId: active.id as string,
              planId,
              newStartTime: timeSlot,
              planDate
            })
          } else {
            // Show conflict resolution
            setPendingTimeUpdate({
              stopId: active.id as string,
              timeSlot,
              conflicts: suggestion.conflicts,
              alternatives: suggestion.alternatives
            })
          }
        } catch (error) {
          console.error('Failed to check time slot:', error)
        }
      }
    }
  }

  const handleConfirmTimeUpdate = async (useAlternative?: string) => {
    if (!pendingTimeUpdate) return
    
    const finalTime = useAlternative || pendingTimeUpdate.timeSlot
    
    try {
      await stopTimeUpdate.mutateAsync({
        stopId: pendingTimeUpdate.stopId,
        planId,
        newStartTime: finalTime,
        planDate
      })
      setPendingTimeUpdate(null)
    } catch (error) {
      console.error('Failed to update time:', error)
    }
  }

  const handleCancelTimeUpdate = () => {
    setPendingTimeUpdate(null)
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

  const toggleExpanded = () => {
    setIsExpanded(!isExpanded)
  }

  const toggleEmptySlots = () => {
    setShowEmptySlots(!showEmptySlots)
  }

  return (
    <>
      <Card className={cn("flex flex-col bg-background", className)}>
        {/* Collapsible Header */}
        <div className="p-3 sm:p-4 border-b border-border/10 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 sm:w-5 sm:h-5" />
              <h2 className="text-base sm:text-lg font-semibold">Timeline</h2>
              {currentDragStopId && (
                <Badge variant="outline" className="text-xs animate-pulse">
                  Dragging...
                </Badge>
              )}
              {stopTimeUpdate.isPending && (
                <Badge variant="outline" className="text-xs">
                  Updating...
                </Badge>
              )}
            </div>
            
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-xs">
                {stops.length} stops
              </Badge>
              
              {/* View Controls */}
              <div className="flex items-center gap-1">
                {stops.length > 0 && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={toggleEmptySlots}
                    className="h-8 px-2 text-xs"
                  >
                    {showEmptySlots ? <Minimize2 className="w-3 h-3" /> : <Maximize2 className="w-3 h-3" />}
                  </Button>
                )}
                
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={toggleExpanded}
                  className="h-8 px-2"
                >
                  {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </Button>
              </div>
            </div>
          </div>
          
          {/* Quick Stats */}
          {stops.length > 0 && (
            <div className="mt-2 text-xs text-muted-foreground">
              {displayedTimeSlots.length} slots shown • {allTimeSlots.length - displayedTimeSlots.length} hidden
            </div>
          )}
        </div>

        {/* Timeline Content - Dynamically sized */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeInOut' }}
              className="overflow-hidden"
            >
              <div className="p-3 sm:p-4 space-y-2 sm:space-y-3 max-h-[60vh] overflow-y-auto">
                <DndContext
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                  modifiers={[restrictToVerticalAxis]}
                  collisionDetection={closestCenter}
                >
                  <SortableContext items={stops.map(s => s.id)} strategy={verticalListSortingStrategy}>
                    <AnimatePresence>
                      {displayedTimeSlots.map((timeSlot) => {
                        const stopAtTime = timelineStops.find(stop => 
                          stop.start_time?.startsWith(timeSlot) || stop.startTime?.startsWith(timeSlot)
                        )
                        const isDraggedOver = dragOverTimeSlot === timeSlot
                        const isEmpty = !stopAtTime
                        const conflict = timeSlotConflicts[timeSlot]

                        return (
                          <motion.div
                            key={timeSlot}
                            layout
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                            transition={{ duration: 0.2 }}
                            className="space-y-1"
                          >
                            {/* Compact Time Label */}
                            <div className="flex items-center gap-2 sm:gap-3">
                              <div className="w-12 sm:w-16 flex items-center gap-1 text-xs sm:text-sm font-medium text-muted-foreground flex-shrink-0">
                                <Clock className="w-3 h-3" />
                                {timeSlot}
                                {conflict && (
                                  <AlertTriangle className="w-3 h-3 text-yellow-500" />
                                )}
                              </div>
                              
                              <div className="flex-1 min-w-0">
                                <DroppableTimeSlot 
                                  timeSlot={timeSlot} 
                                  isDraggedOver={isDraggedOver}
                                  isEmpty={isEmpty}
                                  hasConflict={!!conflict}
                                  conflictSeverity={conflict?.severity}
                                >
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
                                      compact={true} // Use compact mode for mobile
                                    />
                                  ) : (
                                    <AddStopButton
                                      timeSlot={timeSlot}
                                      onAdd={handleAddStopClick}
                                      isDragOver={isDraggedOver}
                                      disabled={planStatus !== 'draft'}
                                      className={cn(
                                        "py-2 px-3 text-xs", // Smaller for mobile
                                        isDraggedOver && !conflict && "border-primary bg-primary/10",
                                        isDraggedOver && conflict && "border-yellow-500 bg-yellow-500/10"
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
            </motion.div>
          )}
        </AnimatePresence>

        {/* Drag Instructions - Only show when dragging */}
        <AnimatePresence>
          {currentDragStopId && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="px-3 py-2 bg-primary/5 border-t border-primary/20 flex-shrink-0"
            >
              <p className="text-xs text-center text-muted-foreground">
                💡 Drag to reorder or drop on time slot to reschedule
              </p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Collapsed Summary */}
        {!isExpanded && stops.length > 0 && (
          <div className="p-3 sm:p-4 flex-shrink-0">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">
                {stops.length} stops planned
              </span>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleExpanded}
                className="text-xs h-6"
              >
                View Timeline
              </Button>
            </div>
          </div>
        )}
      </Card>

      {/* Conflict Resolution Dialog */}
      <AnimatePresence>
        {pendingTimeUpdate && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="bg-background rounded-lg p-6 max-w-md w-full"
            >
              <div className="flex items-center gap-2 mb-4">
                <AlertTriangle className="w-5 h-5 text-yellow-500" />
                <h3 className="font-semibold">Schedule Conflict</h3>
              </div>
              
              <p className="text-sm text-muted-foreground mb-4">
                The requested time slot conflicts with existing stops. Choose an alternative:
              </p>
              
              <div className="space-y-2 mb-4">
                {pendingTimeUpdate.alternatives.map((alt, index) => (
                  <Button
                    key={alt}
                    variant="outline"
                    className="w-full justify-start text-sm"
                    onClick={() => handleConfirmTimeUpdate(alt)}
                  >
                    <CheckCircle className="w-4 h-4 mr-2 text-green-500" />
                    {alt} {index === 0 && '(Recommended)'}
                  </Button>
                ))}
              </div>
              
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  onClick={handleCancelTimeUpdate}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  onClick={() => handleConfirmTimeUpdate()}
                  className="flex-1"
                >
                  Force Update
                </Button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
