import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { DndContext, DragEndEvent, DragOverlay, useDroppable } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { Plus, Wifi, WifiOff, AlertTriangle } from 'lucide-react'
import { usePlanStops } from '@/hooks/usePlanStops'
import { usePlanSync } from '@/hooks/usePlanSync'
import { PresenceIndicator } from '@/components/collaboration/PresenceIndicator'
import { StopCardBase } from './StopCardBase'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import type { PlanStop } from '@/types/plan'

// Using PlanStop directly instead of duplicate interface

interface TimelineGridProps {
  planId: string
  startTime?: string
  endTime?: string
  activeParticipants?: any[]
  connectionStatus?: 'connecting' | 'connected' | 'disconnected' | 'error'
  isOptimistic?: boolean
}

export function TimelineGrid({ 
  planId, 
  startTime = '18:00', 
  endTime = '00:00',
  activeParticipants = [],
  connectionStatus = 'disconnected',
  isOptimistic = false
}: TimelineGridProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const { data: stops = [], isLoading } = usePlanStops(planId)
  const { mutate: syncChanges } = usePlanSync()

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

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[...Array(6)].map((_, i) => (
          <div key={i} className="h-20 bg-muted/50 rounded-xl animate-pulse" />
        ))}
      </div>
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
                onAddStop={handleAddStop}
                isOptimistic={isOptimistic}
                getStopColor={getStopColor}
              />
            )
          })}
        </div>
        
        <DragOverlay>
          {activeId ? (
            <StopCard 
              stop={stops.find(s => s.id === activeId)!}
              isDragging
            />
          ) : null}
        </DragOverlay>
      </DndContext>
    </div>
  )
}

function TimeSlot({ 
  timeBlock, 
  stops, 
  onAddStop,
  isOptimistic,
  getStopColor
}: { 
  timeBlock: any
  stops: PlanStop[]
  onAddStop: (time: string) => void
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
              <StopCard 
                key={stop.id} 
                stop={stop} 
                color={getStopColor?.(stop)}
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

function StopCard({ 
  stop, 
  isDragging = false,
  color 
}: { 
  stop: PlanStop; 
  isDragging?: boolean;
  color?: string;
}) {
  return (
    <motion.div
      initial={{ scale: 0.95, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.2 }}
      style={color ? { '--stop-color': color } as any : undefined}
      className={cn(
        "transition-all duration-300",
        isDragging && "animate-pulse"
      )}
    >
      <StopCardBase 
        stop={stop}
        isDragging={isDragging}
        draggable={true}
        className={color ? 'border-[var(--stop-color)] bg-[var(--stop-color)]/10' : undefined}
      />
    </motion.div>
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