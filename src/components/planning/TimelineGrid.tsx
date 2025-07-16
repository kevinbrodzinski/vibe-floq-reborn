import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { DndContext, DragEndEvent, DragOverlay, useDroppable } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { Plus, Wifi, WifiOff, AlertTriangle } from 'lucide-react'
import { usePlanStops } from '@/hooks/usePlanStops'
import { usePlanSync } from '@/hooks/usePlanSync'
import { useStopResize } from '@/hooks/useStopResize'
import { useStopSelection } from '@/hooks/useStopSelection'
import { PresenceIndicator } from '@/components/collaboration/PresenceIndicator'
import { ResizableStopCard } from './ResizableStopCard'
import { BulkActionsToolbar } from './BulkActionsToolbar'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { PlanStop } from '@/types/plan'
import { TimelineGridSkeleton, DragOperationSkeleton } from './TimelineGridSkeleton'

// Using PlanStop directly instead of duplicate interface

interface TimelineGridProps {
  planId: string
  startTime?: string
  endTime?: string
  activeParticipants?: any[]
  connectionStatus?: 'connecting' | 'connected' | 'disconnected' | 'error'
  isOptimistic?: boolean
  isDragOperationPending?: boolean
}

export function TimelineGrid({ 
  planId, 
  startTime = '18:00', 
  endTime = '00:00',
  activeParticipants = [],
  connectionStatus = 'disconnected',
  isOptimistic = false,
  isDragOperationPending = false
}: TimelineGridProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const { data: stops = [], isLoading } = usePlanStops(planId)
  const { mutate: syncChanges } = usePlanSync()

  // Stop selection
  const {
    selectedStops,
    toggleSelection,
    selectRange,
    clearSelection,
    bulkDelete,
    bulkMove,
    bulkDuplicate,
    hasSelection
  } = useStopSelection()

  // Stop resizing
  const { resizingStop, startResize, handleResize, endResize } = useStopResize({
    onUpdateDuration: (stopId: string, duration: number) => {
      syncChanges({
        plan_id: planId,
        changes: {
          type: 'update_stop',
          data: { id: stopId, duration_minutes: duration }
        }
      })
    }
  })

  // Generate time blocks based on window with safety guards
  const timeBlocks = useMemo(() => {
    const start = parseInt(startTime.split(':')[0])
    const end = parseInt(endTime.split(':')[0]) || 24
    const blocks = []
    let loopCount = 0
    
    for (let hour = start; hour !== end; hour = (hour + 1) % 24) {
      if (loopCount++ > 48) break // Prevent infinite loop
      blocks.push({
        hour,
        label: formatHour(hour),
        time: `${hour.toString().padStart(2, '0')}:00`
      })
      if (blocks.length >= 12) break // Safety limit
    }
    
    return blocks
  }, [startTime, endTime])

  // Memoize stops in time slots for performance
  const getStopsInTimeSlot = useMemo(() => {
    return (timeSlot: string) => stops.filter(stop => 
      (stop.start_time || stop.startTime)?.startsWith(timeSlot.substring(0, 2))
    )
  }, [stops])

  // Color-code stops by status for visual scanability
  const getStopColor = (stop: PlanStop) => {
    switch (stop.status) {
      case 'confirmed': return 'hsl(220 70% 60%)'
      case 'suggested': return 'hsl(280 70% 60%)'
      case 'pending': return 'hsl(45 70% 60%)'
      default: return 'hsl(220 70% 60%)'
    }
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    
    if (over && active.id !== over.id) {
      const oldIndex = stops.findIndex(stop => stop.id === active.id)
      const newIndex = stops.findIndex(stop => stop.id === over.id)
      
      if (oldIndex !== -1 && newIndex !== -1) {
        const newStops = arrayMove(stops, oldIndex, newIndex)
        
        // Update stop order in backend
        syncChanges({
          plan_id: planId,
          changes: {
            type: 'reorder_stops',
            data: {
              updates: newStops.map((stop, index) => ({
                id: (stop as PlanStop).id,
                stop_order: index
              }))
            }
          }
        })
      }
    }
    
    setActiveId(null)
  }

  const handleAddStop = (timeSlot: string) => {
    syncChanges({
      plan_id: planId,
      changes: {
        type: 'update_stop',
        data: {
          title: 'New Stop',
          start_time: timeSlot,
          duration_minutes: 60,
          stop_order: stops.length
        }
      }
    })
  }

  // Bulk operations
  const handleBulkDelete = () => {
    bulkDelete(stops, (stopId) => {
      // Use update_stop with deleted flag or handle deletion differently
      syncChanges({
        plan_id: planId,
        changes: {
          type: 'update_stop',
          data: { id: stopId, deleted: true }
        }
      })
    })
  }

  const handleBulkDuplicate = () => {
    bulkDuplicate((stopId) => {
      const originalStop = stops.find(s => s.id === stopId)
      if (originalStop) {
        syncChanges({
          plan_id: planId,
          changes: {
            type: 'update_stop',
            data: {
              ...originalStop,
              title: `${originalStop.title} (Copy)`,
              stop_order: stops.length
            }
          }
        })
      }
    })
  }

  const handleBulkMove = () => {
    // For now, just move to next hour
    const nextHour = new Date()
    nextHour.setHours(nextHour.getHours() + 1)
    const timeString = nextHour.toTimeString().slice(0, 5)
    
    bulkMove(timeString, (stopId, newTime) => {
      syncChanges({
        plan_id: planId,
        changes: {
          type: 'update_stop',
          data: { id: stopId, start_time: newTime }
        }
      })
    })
  }

  const handleBulkReschedule = () => {
    // Simple reschedule - add 30 minutes to each
    selectedStops.forEach(stopId => {
      const stop = stops.find(s => s.id === stopId)
      if (stop?.start_time) {
        const [hours, minutes] = stop.start_time.split(':').map(Number)
        const newTime = new Date()
        newTime.setHours(hours, minutes + 30)
        const timeString = newTime.toTimeString().slice(0, 5)
        
        syncChanges({
          plan_id: planId,
          changes: {
            type: 'update_stop',
            data: { id: stopId, start_time: timeString }
          }
        })
      }
    })
    clearSelection()
  }

  if (isLoading) {
    return <TimelineGridSkeleton timeSlots={6} />
  }

  // Show drag operation loading overlay
  if (isDragOperationPending) {
    return (
      <>
        <TimelineGridSkeleton timeSlots={6} className="opacity-50" />
        <DragOperationSkeleton />
      </>
    )
  }

  // Empty timeline fallback
  if (stops.length === 0) {
    return (
      <div className="text-center py-12 space-y-4">
        <div className="text-6xl">🚀</div>
        <h3 className="text-xl font-semibold text-foreground">
          Let's start your night
        </h3>
        <p className="text-muted-foreground">
          Add your first stop to begin planning
        </p>
        <button
          onClick={() => handleAddStop('19:00')}
          className="bg-primary text-primary-foreground px-6 py-3 rounded-xl font-medium hover:bg-primary/90 transition-colors"
        >
          Add First Stop
        </button>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      {/* Collaboration Header with aria-live for accessibility */}
      <div 
        className="flex items-center justify-between p-3 bg-card/50 rounded-lg border"
        aria-live="polite"
        aria-label="Collaboration status"
      >
        <PresenceIndicator 
          participants={activeParticipants}
          connectionStatus={connectionStatus}
        />
        
        <div className="flex items-center gap-2">
          {isOptimistic && (
            <Badge variant="secondary" className="animate-pulse">
              <Wifi className="w-3 h-3 mr-1" />
              Syncing...
            </Badge>
          )}
          
          {connectionStatus === 'error' && (
            <Badge variant="destructive">
              <AlertTriangle className="w-3 h-3 mr-1" />
              Connection Error
            </Badge>
          )}
        </div>
      </div>

      <DndContext onDragEnd={handleDragEnd}>
        <div className="space-y-3">
          {timeBlocks.map((block) => {
            const stopsAtTime = getStopsInTimeSlot(block.time)

            return (
              <TimeSlot
                key={block.time}
                timeBlock={block}
                stops={stopsAtTime}
                selectedStops={selectedStops}
                resizingStop={resizingStop}
                onAddStop={handleAddStop}
                onSelectStop={toggleSelection}
                onStartResize={startResize}
                onResize={handleResize}
                onEndResize={endResize}
                isOptimistic={isOptimistic}
                getStopColor={getStopColor}
              />
            )
          })}
        </div>
        
        <DragOverlay>
          {activeId ? (
            <ResizableStopCard 
              stop={stops.find(s => s.id === activeId)!}
            />
          ) : null}
        </DragOverlay>
      </DndContext>

      {/* Bulk Actions Toolbar */}
      <BulkActionsToolbar
        selectedCount={selectedStops.size}
        onClearSelection={clearSelection}
        onBulkDelete={handleBulkDelete}
        onBulkDuplicate={handleBulkDuplicate}
        onBulkMove={handleBulkMove}
        onBulkReschedule={handleBulkReschedule}
      />
    </div>
  )
}

function TimeSlot({ 
  timeBlock, 
  stops, 
  selectedStops,
  resizingStop,
  onAddStop,
  onSelectStop,
  onStartResize,
  onResize,
  onEndResize,
  isOptimistic,
  getStopColor
}: { 
  timeBlock: any
  stops: PlanStop[]
  selectedStops: Set<string>
  resizingStop: string | null
  onAddStop: (time: string) => void
  onSelectStop: (stopId: string, isMultiSelect?: boolean, isRangeSelect?: boolean) => void
  onStartResize: (stopId: string, stop: PlanStop, clientY: number) => void
  onResize: (clientY: number) => number | undefined
  onEndResize: (clientY: number) => void
  isOptimistic?: boolean
  getStopColor?: (stop: PlanStop) => string
}) {
  const { setNodeRef } = useDroppable({ id: timeBlock.time })

  return (
    <div 
      ref={setNodeRef}
      className={cn(
        "flex items-center gap-4 min-h-[80px] p-4 rounded-xl border border-border/30 bg-card/50 backdrop-blur-sm transition-all",
        isOptimistic && "opacity-70 bg-yellow-50/50 border-yellow-200"
      )}
    >
      <div className="w-16 text-sm font-medium text-muted-foreground">
        {timeBlock.label}
      </div>
      
      <div className="flex-1">
        {stops.length > 0 ? (
          <div className="space-y-2">
            {stops.map(stop => (
              <ResizableStopCard 
                key={stop.id} 
                stop={stop}
                isSelected={selectedStops.has(stop.id)}
                isResizing={resizingStop === stop.id}
                onSelect={onSelectStop}
                onStartResize={onStartResize}
                onResize={onResize}
                onEndResize={onEndResize}
                className={getStopColor?.(stop) ? `border-[${getStopColor(stop)}] bg-[${getStopColor(stop)}]/10` : undefined}
              />
            ))}
          </div>
        ) : (
          <AddStopTrigger 
            onAdd={() => onAddStop(timeBlock.time)}
          />
        )}
      </div>
    </div>
  )
}


function AddStopTrigger({ onAdd }: { onAdd: () => void }) {
  return (
    <button
      onClick={onAdd}
      className="w-full h-16 border-2 border-dashed border-muted-foreground/30 rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all duration-300 flex items-center justify-center gap-2 text-muted-foreground hover:text-primary"
    >
      <Plus size={16} />
      <span className="text-sm">Add Stop</span>
    </button>
  )
}

function formatHour(hour: number): string {
  const date = new Date()
  date.setHours(hour, 0, 0, 0)
  return date.toLocaleTimeString([], { 
    hour: 'numeric', 
    hour12: true 
  })
}