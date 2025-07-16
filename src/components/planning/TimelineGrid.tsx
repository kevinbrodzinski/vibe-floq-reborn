import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { DndContext, DragEndEvent, DragOverlay, useDroppable } from '@dnd-kit/core'
import { arrayMove } from '@dnd-kit/sortable'
import { Plus, Wifi, WifiOff, AlertTriangle } from 'lucide-react'
import { usePlanStops } from '@/hooks/usePlanStops'
import { usePlanSync } from '@/hooks/usePlanSync'
import { useHapticFeedback } from '@/hooks/useHapticFeedback'
import { useStopConflictChecker } from '@/hooks/useStopConflictChecker'
import { useErrorBoundary } from '@/hooks/useErrorBoundary'
import { useNetworkRecovery } from '@/hooks/useNetworkRecovery'
import { ConflictOverlay } from './ConflictOverlay'
import { toastSuccess, toastError } from '@/lib/toast'
import { timeToMinutes, formatTimeFromMinutes } from '@/lib/time'
import { generateTimeSuggestions, snapToSuggestedSlot } from '@/utils/stopTimeUtils'
import { useStopResize } from '@/hooks/useStopResize'
import { useStopSelection } from '@/hooks/useStopSelection'
import { PresenceIndicator } from '@/components/collaboration/PresenceIndicator'
import { LiveCursors } from '@/components/collaboration/LiveCursors'
import { useAutoScroll } from '@/hooks/useAutoScroll'
import { useAdvancedHaptics } from '@/hooks/useAdvancedHaptics'
import { useAudioFeedback } from '@/hooks/useAudioFeedback'
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
  const [showConflictOverlay, setShowConflictOverlay] = useState(false)
  const [conflictData, setConflictData] = useState<any>(null)
  const { data: stops = [], isLoading } = usePlanStops(planId)
  const { mutate: syncChanges } = usePlanSync()
  const { socialHaptics } = useHapticFeedback()
  const { conflicts, hasConflicts, isStopConflicting } = useStopConflictChecker(stops)
  const { withErrorHandling } = useErrorBoundary()
  const { isOnline, canRetry, retryConnection } = useNetworkRecovery()
  const { setContainer } = useAutoScroll({ enabled: true })
  const { timelineHaptics } = useAdvancedHaptics()
  const { timelineAudio } = useAudioFeedback()

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
        
        // Enhanced haptic and audio feedback
        timelineHaptics.stopDragEnd()
        timelineAudio.stopDrop()
        
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
        
        toastSuccess('Schedule updated')
      }
    }
    
    setActiveId(null)
  }

  const handleAddStop = withErrorHandling((timeSlot: string) => {
    // Enhanced feedback for stop creation
    timelineHaptics.stopCreate()
    timelineAudio.stopCreate()
    
    // Generate AI suggestions for optimal timing
    const suggestions = generateTimeSuggestions(planId, stops)
    const suggestedSlot = suggestions.find(s => s.startTime === timeSlot)
    
    // Check for time conflicts
    const newStopStart = timeToMinutes(timeSlot)
    const newStopEnd = newStopStart + 60 // 60 minutes default
    
    const hasConflict = stops.some(stop => {
      const stopStart = timeToMinutes(stop.startTime || stop.start_time || '')
      const stopEnd = stopStart + (stop.duration_minutes || 60)
      return (newStopStart < stopEnd && newStopEnd > stopStart)
    })
    
    if (hasConflict) {
      setConflictData({
        type: 'time_overlap',
        message: 'This time slot overlaps with an existing stop.',
        suggestion: suggestedSlot?.reason || 'Try a different time or adjust the duration of nearby stops.'
      })
      setShowConflictOverlay(true)
      timelineHaptics.stopConflict()
      timelineAudio.stopConflict()
      return
    }
    
    const newStopData = {
      title: 'New Stop',
      start_time: timeSlot,
      duration_minutes: suggestedSlot ? 60 : 60, // Use AI suggestion or default
      stop_order: stops.length,
      suggested: !!suggestedSlot
    }
    
    syncChanges({
      plan_id: planId,
      changes: {
        type: 'update_stop',
        data: newStopData
      }
    })
    
    toastSuccess(suggestedSlot ? 'Stop added with AI suggestion' : 'Stop added')
  })

  // Handle delete stop with optimistic updates
  const handleDeleteStop = withErrorHandling(async (stopId: string) => {
    try {
      await syncChanges({
        plan_id: planId,
        changes: { type: 'delete_stop', data: { id: stopId } }
      })
      
      socialHaptics.gestureConfirm()
      toastSuccess('Stop deleted')
    } catch (error) {
      toastError('Failed to delete stop', 'Please try again')
    }
  })

  // Bulk operations
  const handleBulkDelete = () => {
    bulkDelete(stops, (stopId) => {
      handleDeleteStop(stopId)
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
    <div className="space-y-4" ref={setContainer}>
      {/* Live Cursors for real-time collaboration */}
      <LiveCursors planId={planId} enabled={connectionStatus === 'connected'} />
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
            {/* Conflict indicator */}
            {hasConflicts && (
              <Badge variant="destructive">
                <AlertTriangle className="w-3 h-3 mr-1" />
                {conflicts.length} Conflict{conflicts.length !== 1 ? 's' : ''}
              </Badge>
            )}
            
            {/* Network status */}
            {!isOnline && (
              <Badge variant="outline" className="border-orange-500 text-orange-700">
                <WifiOff className="w-3 h-3 mr-1" />
                Offline
                {canRetry && (
                  <button
                    onClick={retryConnection}
                    className="ml-2 text-xs underline hover:no-underline"
                  >
                    Retry
                  </button>
                )}
              </Badge>
            )}
            
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
                onDeleteStop={handleDeleteStop}
                isOptimistic={isOptimistic}
                getStopColor={getStopColor}
                isStopConflicting={isStopConflicting}
                allStops={stops}
                planId={planId}
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

      {/* Conflict Resolution Overlay */}
      <ConflictOverlay
        isVisible={showConflictOverlay}
        conflictType={conflictData?.type || 'time_overlap'}
        message={conflictData?.message || ''}
        suggestion={conflictData?.suggestion}
        onResolve={() => {
          setShowConflictOverlay(false)
          // Auto-resolve logic could go here
          toastSuccess('Conflict resolved')
        }}
        onDismiss={() => {
          setShowConflictOverlay(false)
          toastError('Conflict dismissed')
        }}
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
  onDeleteStop,
  isOptimistic,
  getStopColor,
  isStopConflicting,
  allStops,
  planId
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
  onDeleteStop: (stopId: string) => void
  isOptimistic?: boolean
  getStopColor?: (stop: PlanStop) => string
  isStopConflicting: (stopId: string) => boolean
  allStops: PlanStop[]
  planId: string
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
                 planId={planId}
                 isSelected={selectedStops.has(stop.id)}
                 isResizing={resizingStop === stop.id}
                 hasConflict={isStopConflicting(stop.id)}
                 suggested={(stop as any).suggested}
                 allStops={allStops}
                 onSelect={onSelectStop}
                 onStartResize={onStartResize}
                 onResize={onResize}
                 onEndResize={onEndResize}
                 onRemove={() => onDeleteStop(stop.id)}
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
      className="w-full border-2 border-dashed border-border/30 rounded-xl h-20 flex items-center justify-center text-muted-foreground cursor-pointer hover:border-border/60 hover:bg-muted/20 transition-all duration-200"
      role="button"
      aria-label="Add new stop to this time slot"
    >
      <div className="flex items-center gap-2">
        <div className="w-2 h-2 rounded-full bg-current opacity-50" />
        <span className="text-sm">Add Stop</span>
        <div className="w-2 h-2 rounded-full bg-current opacity-50" />
      </div>
    </button>
  )
}

function formatHour(hour: number): string {
  return formatTimeFromMinutes(hour * 60)
}