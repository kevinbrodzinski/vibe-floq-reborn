import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { DndContext, DragEndEvent, DragOverlay, useDraggable, useDroppable } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { usePlanStops } from '@/hooks/usePlanStops'
import { usePlanSync } from '@/hooks/usePlanSync'
import { cn } from '@/lib/utils'

interface Stop {
  id: string
  title: string
  start_time: string
  end_time?: string
  duration_minutes?: number
  venue?: any
}

interface TimelineGridProps {
  planId: string
  startTime?: string
  endTime?: string
}

export function TimelineGrid({ planId, startTime = '18:00', endTime = '00:00' }: TimelineGridProps) {
  const [activeId, setActiveId] = useState<string | null>(null)
  const { data: stops = [], isLoading } = usePlanStops(planId)
  const { mutate: syncChanges } = usePlanSync()

  // Generate time blocks based on window
  const timeBlocks = useMemo(() => {
    const start = parseInt(startTime.split(':')[0])
    const end = parseInt(endTime.split(':')[0]) || 24
    const blocks = []
    
    for (let hour = start; hour !== end; hour = (hour + 1) % 24) {
      blocks.push({
        hour,
        label: formatHour(hour),
        time: `${hour.toString().padStart(2, '0')}:00`
      })
      if (blocks.length >= 12) break // Safety limit
    }
    
    return blocks
  }, [startTime, endTime])

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
                id: (stop as Stop).id,
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

  return (
    <DndContext onDragEnd={handleDragEnd}>
      <div className="space-y-3">
        {timeBlocks.map((block) => {
          const stopsAtTime = stops.filter(stop => 
            stop.start_time?.startsWith(block.time.substring(0, 2))
          )

          return (
            <TimeSlot
              key={block.time}
              timeBlock={block}
              stops={stopsAtTime}
              onAddStop={handleAddStop}
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
  )
}

function TimeSlot({ 
  timeBlock, 
  stops, 
  onAddStop 
}: { 
  timeBlock: any
  stops: Stop[]
  onAddStop: (time: string) => void 
}) {
  const { setNodeRef } = useDroppable({ id: timeBlock.time })

  return (
    <div 
      ref={setNodeRef}
      className="flex items-center gap-4 min-h-[80px] p-4 rounded-xl border border-border/30 bg-card/50 backdrop-blur-sm"
    >
      <div className="w-16 text-sm font-medium text-muted-foreground">
        {timeBlock.label}
      </div>
      
      <div className="flex-1">
        {stops.length > 0 ? (
          <div className="space-y-2">
            {stops.map(stop => (
              <StopCard key={stop.id} stop={stop} />
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

function StopCard({ stop, isDragging = false }: { stop: Stop; isDragging?: boolean }) {
  const { 
    attributes, 
    listeners, 
    setNodeRef, 
    transform 
  } = useDraggable({ 
    id: stop.id,
    data: { stop }
  })

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
  } : undefined

  return (
    <motion.div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      className={cn(
        "p-3 rounded-xl bg-primary/10 border border-primary/20 cursor-grab active:cursor-grabbing",
        isDragging && "opacity-50 rotate-2 scale-105"
      )}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      <div className="flex justify-between items-start">
        <div>
          <h4 className="font-medium text-foreground">{stop.title}</h4>
          {stop.venue?.name && (
            <p className="text-sm text-muted-foreground">{stop.venue.name}</p>
          )}
        </div>
        <div className="text-xs text-muted-foreground">
          {stop.duration_minutes || 60}min
        </div>
      </div>
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