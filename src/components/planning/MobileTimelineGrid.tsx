
import { useState } from 'react'
import { motion, PanInfo } from 'framer-motion'
import { Plus, GripVertical, Clock } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'
import { MobileGestureEnhancements } from '@/components/MobileGestureEnhancements'
import { TimelineGrid } from './TimelineGrid'
import { AddStopButton } from '@/components/AddStopButton'
import { cn } from '@/lib/utils'
import type { PlanStop } from '@/types/plan'

interface MobileTimelineGridProps {
  planId: string
  planStatus: string
  startTime?: string
  endTime?: string
  activeParticipants?: any[]
  connectionStatus?: 'connecting' | 'connected' | 'disconnected' | 'error'
  isOptimistic?: boolean
  isDragOperationPending?: boolean
  onStopReorder?: (stopId: string, newIndex: number) => void
  onStopSelect?: (stopId: string) => void
  selectedStopIds?: string[]
  recentVotes?: any[]
  stops?: PlanStop[]
  onAddStop?: (timeSlot?: string) => void
}

export function MobileTimelineGrid({
  planId,
  planStatus,
  startTime = '18:00',
  endTime = '23:00', 
  activeParticipants,
  connectionStatus,
  isOptimistic,
  isDragOperationPending,
  onStopReorder,
  onStopSelect,
  selectedStopIds = [],
  recentVotes = [],
  stops = [],
  onAddStop
}: MobileTimelineGridProps) {
  const isMobile = useIsMobile()
  const [draggedStopId, setDraggedStopId] = useState<string | null>(null)
  const [showCompactView, setShowCompactView] = useState(false)

  if (!isMobile) {
    return (
      <TimelineGrid 
        planId={planId}
        planStatus={planStatus}
        startTime={startTime}
        endTime={endTime}
        activeParticipants={activeParticipants}
        connectionStatus={connectionStatus}
        isOptimistic={isOptimistic}
        isDragOperationPending={isDragOperationPending}
      />
    )
  }

  // Generate time slots for mobile view
  const generateTimeSlots = () => {
    const slots = []
    const start = parseInt(startTime.split(':')[0])
    const end = parseInt(endTime.split(':')[0])
    
    for (let hour = start; hour <= end; hour++) {
      const timeSlot = `${hour.toString().padStart(2, '0')}:00`
      slots.push(timeSlot)
    }
    return slots
  }

  const timeSlots = generateTimeSlots()

  return (
    <MobileGestureEnhancements
      onSwipeLeft={() => setShowCompactView(!showCompactView)}
      onSwipeRight={() => setShowCompactView(!showCompactView)}
      onLongPress={() => onStopSelect?.(selectedStopIds[0] || '')}
      className="w-full min-h-fit"
    >
      <div className={cn(
        "space-y-3 p-4 min-h-fit",
        showCompactView && "space-y-2"
      )}>
        {/* Mobile Header */}
        <div className="flex items-center justify-between bg-card/80 rounded-xl p-3 border sticky top-0 z-10 backdrop-blur-sm">
          <div className="flex items-center gap-2">
            <button 
              onClick={() => setShowCompactView(!showCompactView)}
              className="p-2 rounded-lg hover:bg-muted/50 transition-colors"
            >
              <GripVertical size={16} className="text-muted-foreground" />
            </button>
            <span className="text-sm font-medium">
              {showCompactView ? 'Compact' : 'Timeline'}
            </span>
          </div>
          
          <div className="text-xs text-muted-foreground">
            Swipe ← → to toggle view
          </div>
        </div>

        {/* Mobile Timeline Content */}
        {showCompactView ? (
          <MobileCompactTimeline 
            planId={planId}
            stops={stops}
            onStopSelect={onStopSelect}
            selectedStopIds={selectedStopIds}
            onAddStop={onAddStop}
          />
        ) : (
          <MobileExpandedTimeline 
            planId={planId}
            startTime={startTime}
            endTime={endTime}
            timeSlots={timeSlots}
            stops={stops}
            onStopReorder={onStopReorder}
            onStopSelect={onStopSelect}
            selectedStopIds={selectedStopIds}
            draggedStopId={draggedStopId}
            setDraggedStopId={setDraggedStopId}
            onAddStop={onAddStop}
          />
        )}
      </div>
    </MobileGestureEnhancements>
  )
}

// Compact mobile view - scrollable cards with add button
function MobileCompactTimeline({ 
  planId, 
  stops,
  onStopSelect, 
  selectedStopIds,
  onAddStop
}: { 
  planId: string
  stops: PlanStop[]
  onStopSelect?: (stopId: string) => void
  selectedStopIds: string[]
  onAddStop?: (timeSlot?: string) => void
}) {
  return (
    <div className="space-y-2 pb-safe-area-inset-bottom">
      {stops.length === 0 ? (
        <button
          onClick={() => onAddStop?.()}
          className="flex flex-col items-center justify-center h-32 rounded-2xl border-2 border-dashed border-muted/40 text-muted-foreground hover:border-primary hover:text-primary transition-colors w-full"
        >
          <Plus className="w-5 h-5 mb-1" />
          <span className="text-sm">Add your first stop</span>
        </button>
      ) : (
        <>
          {stops.map((stop) => (
            <motion.div
              key={stop.id}
              layout
              className="bg-card rounded-xl p-4 border cursor-pointer hover:bg-card/80 transition-colors"
              onClick={() => onStopSelect?.(stop.id)}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-medium">{stop.title}</h3>
                  <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                    <Clock size={12} />
                    <span>{stop.start_time} - {stop.end_time}</span>
                  </div>
                  {stop.description && (
                    <p className="text-sm text-muted-foreground mt-1">{stop.description}</p>
                  )}
                </div>
              </div>
            </motion.div>
          ))}
          <button
            onClick={() => onAddStop?.()}
            className="flex flex-col items-center justify-center h-20 rounded-xl border-2 border-dashed border-muted/40 text-muted-foreground hover:border-primary hover:text-primary transition-colors w-full"
          >
            <Plus className="w-4 h-4 mb-1" />
            <span className="text-xs">Add stop</span>
          </button>
        </>
      )}
    </div>
  )
}

// Expanded mobile view - time slots with drag and drop
function MobileExpandedTimeline({ 
  planId,
  startTime,
  endTime,
  timeSlots,
  stops,
  onStopReorder,
  onStopSelect,
  selectedStopIds,
  draggedStopId,
  setDraggedStopId,
  onAddStop
}: { 
  planId: string
  startTime?: string
  endTime?: string
  timeSlots: string[]
  stops: PlanStop[]
  onStopReorder?: (stopId: string, newIndex: number) => void
  onStopSelect?: (stopId: string) => void
  selectedStopIds: string[]
  draggedStopId: string | null
  setDraggedStopId: (id: string | null) => void
  onAddStop?: (timeSlot?: string) => void
}) {
  const getStopsForTimeSlot = (timeSlot: string) => {
    return stops.filter(stop => {
      const stopHour = parseInt(stop.start_time.split(':')[0])
      const slotHour = parseInt(timeSlot.split(':')[0])
      return stopHour === slotHour
    })
  }

  if (stops.length === 0) {
    return (
      <div className="space-y-4 pb-safe-area-inset-bottom">
        <div className="flex flex-col items-center py-12 text-muted">
          <span className="text-4xl">📍</span>
          <p className="mt-2">No stops yet</p>
          <motion.button
            whileTap={{ scale: 0.95 }}
            onClick={() => onAddStop?.()}
            className="btn-primary mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors animate-fade-in"
          >
            Add your first stop
          </motion.button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-4 pb-safe-area-inset-bottom">
      {timeSlots.map((timeSlot) => {
        const slotStops = getStopsForTimeSlot(timeSlot)
        
        return (
          <div key={timeSlot} className="space-y-2">
            {/* Time slot header */}
            <div className="flex items-center gap-2 px-2">
              <Clock size={14} className="text-muted-foreground" />
              <span className="text-sm font-medium text-muted-foreground">{timeSlot}</span>
            </div>
            
            {/* Stops in this time slot */}
            {slotStops.map((stop) => (
              <motion.div
                key={stop.id}
                layout
                className="bg-card rounded-xl p-4 border cursor-pointer hover:bg-card/80 transition-colors"
                onClick={() => onStopSelect?.(stop.id)}
                whileTap={{ scale: 0.98 }}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <h3 className="font-medium">{stop.title}</h3>
                    <div className="flex items-center gap-1 text-sm text-muted-foreground mt-1">
                      <span>{stop.start_time} - {stop.end_time}</span>
                    </div>
                    {stop.description && (
                      <p className="text-sm text-muted-foreground mt-1">{stop.description}</p>
                    )}
                  </div>
                </div>
              </motion.div>
            ))}
            
            {/* Add stop button for this time slot */}
            <AddStopButton
              timeSlot={timeSlot}
              onAdd={(slot) => onAddStop?.(slot)}
              className="h-16 text-xs"
            />
          </div>
        )
      })}
    </div>
  )
}
