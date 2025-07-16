import { useState } from 'react'
import { motion, PanInfo } from 'framer-motion'
import { Plus, GripVertical } from 'lucide-react'
import { useIsMobile } from '@/hooks/use-mobile'
import { MobileGestureEnhancements } from '@/components/MobileGestureEnhancements'
import { TimelineGrid } from './TimelineGrid'
import { cn } from '@/lib/utils'
import type { PlanStop } from '@/types/plan'

interface MobileTimelineGridProps {
  planId: string
  startTime?: string
  endTime?: string
  activeParticipants?: any[]
  connectionStatus?: 'connecting' | 'connected' | 'disconnected' | 'error'
  isOptimistic?: boolean
  isDragOperationPending?: boolean
  onStopReorder?: (stopId: string, newIndex: number) => void
  onStopSelect?: (stopId: string) => void
  selectedStopIds?: string[]
}

export function MobileTimelineGrid({
  planId,
  startTime,
  endTime, 
  activeParticipants,
  connectionStatus,
  isOptimistic,
  isDragOperationPending,
  onStopReorder,
  onStopSelect,
  selectedStopIds = []
}: MobileTimelineGridProps) {
  const isMobile = useIsMobile()
  const [draggedStopId, setDraggedStopId] = useState<string | null>(null)
  const [showCompactView, setShowCompactView] = useState(false)

  if (!isMobile) {
    return (
      <TimelineGrid 
        planId={planId}
        startTime={startTime}
        endTime={endTime}
        activeParticipants={activeParticipants}
        connectionStatus={connectionStatus}
        isOptimistic={isOptimistic}
        isDragOperationPending={isDragOperationPending}
      />
    )
  }

  return (
    <MobileGestureEnhancements
      onSwipeLeft={() => setShowCompactView(!showCompactView)}
      onSwipeRight={() => setShowCompactView(!showCompactView)}
      onLongPress={() => onStopSelect?.(selectedStopIds[0] || '')}
      className="h-full w-full"
    >
      <div className={cn(
        "space-y-3 p-4",
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
            onStopSelect={onStopSelect}
            selectedStopIds={selectedStopIds}
          />
        ) : (
          <MobileExpandedTimeline 
            planId={planId}
            startTime={startTime}
            endTime={endTime}
            onStopReorder={onStopReorder}
            onStopSelect={onStopSelect}
            selectedStopIds={selectedStopIds}
            draggedStopId={draggedStopId}
            setDraggedStopId={setDraggedStopId}
          />
        )}
      </div>
    </MobileGestureEnhancements>
  )
}

// Compact mobile view - scrollable cards
function MobileCompactTimeline({ 
  planId, 
  onStopSelect, 
  selectedStopIds 
}: { 
  planId: string
  onStopSelect?: (stopId: string) => void
  selectedStopIds: string[]
}) {
  return (
    <div className="space-y-2">
      {/* Would integrate with actual stops data */}
      {[1, 2, 3].map((_, i) => (
        <motion.div
          key={i}
          whileTap={{ scale: 0.98 }}
          className={cn(
            "bg-card rounded-xl p-4 border transition-all",
            selectedStopIds.includes(`stop-${i}`) && "ring-2 ring-primary bg-primary/5"
          )}
          onClick={() => onStopSelect?.(`stop-${i}`)}
        >
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-primary/20 rounded-lg flex items-center justify-center">
              <span className="text-xs font-bold text-primary">{i + 1}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">Sample Stop {i + 1}</div>
              <div className="text-sm text-muted-foreground">7:00 PM - 8:30 PM</div>
            </div>
            <div className="text-xs bg-muted rounded px-2 py-1">
              90m
            </div>
          </div>
        </motion.div>
      ))}
    </div>
  )
}

// Expanded mobile view - drag and drop timeline
function MobileExpandedTimeline({ 
  planId,
  startTime,
  endTime,
  onStopReorder,
  onStopSelect,
  selectedStopIds,
  draggedStopId,
  setDraggedStopId
}: { 
  planId: string
  startTime?: string
  endTime?: string
  onStopReorder?: (stopId: string, newIndex: number) => void
  onStopSelect?: (stopId: string) => void
  selectedStopIds: string[]
  draggedStopId: string | null
  setDraggedStopId: (id: string | null) => void
}) {
  const handleDragEnd = (info: PanInfo, stopId: string) => {
    const dragDistance = Math.abs(info.offset.y)
    
    if (dragDistance > 60) {
      // Calculate new position based on drag distance
      const newIndex = Math.floor(dragDistance / 80)
      onStopReorder?.(stopId, newIndex)
    }
    
    setDraggedStopId(null)
  }

  return (
    <div className="space-y-4">
      {/* Time blocks for mobile */}
      {[18, 19, 20, 21, 22, 23].map((hour) => (
        <div key={hour} className="space-y-2">
          <div className="text-sm font-medium text-muted-foreground px-2">
            {hour}:00
          </div>
          
          {/* Sample stop for this hour */}
          <motion.div
            drag="y"
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={0.2}
            onDragStart={() => setDraggedStopId(`stop-${hour}`)}
            onDragEnd={(_, info) => handleDragEnd(info, `stop-${hour}`)}
            whileDrag={{ 
              scale: 1.05, 
              zIndex: 10,
              boxShadow: "0 10px 30px rgba(0,0,0,0.2)"
            }}
            className={cn(
              "bg-card rounded-xl p-4 border-2 border-border/30 transition-all cursor-grab active:cursor-grabbing",
              selectedStopIds.includes(`stop-${hour}`) && "ring-2 ring-primary",
              draggedStopId === `stop-${hour}` && "border-primary bg-primary/5"
            )}
            onClick={() => onStopSelect?.(`stop-${hour}`)}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-primary rounded-lg flex items-center justify-center">
                <span className="text-sm font-bold text-white">{hour - 17}</span>
              </div>
              <div className="flex-1">
                <div className="font-medium">Stop at {hour}:00</div>
                <div className="text-sm text-muted-foreground">Sample venue</div>
              </div>
              <GripVertical size={16} className="text-muted-foreground" />
            </div>
          </motion.div>
        </div>
      ))}
      
      {/* Add stop button */}
      <motion.button
        whileTap={{ scale: 0.95 }}
        className="w-full h-16 border-2 border-dashed border-muted-foreground/30 rounded-xl hover:border-primary/50 hover:bg-primary/5 transition-all flex items-center justify-center gap-2 text-muted-foreground hover:text-primary"
      >
        <Plus size={20} />
        <span>Add Stop</span>
      </motion.button>
    </div>
  )
}