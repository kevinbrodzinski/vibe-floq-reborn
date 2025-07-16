import { useState, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { GripVertical, Clock, AlertTriangle, Sparkles, MoreVertical } from 'lucide-react'
import { cn } from '@/lib/utils'
import { formatTimeFromMinutes, timeToMinutes } from '@/lib/time'
import { useStopConflictChecker } from '@/hooks/useStopConflictChecker'
import { useUpdateStopPosition } from '@/hooks/useUpdateStopPosition'
import { ConflictGlow } from './ConflictGlow'
import { SnapSuggestionOverlay } from './SnapSuggestionOverlay'
import { StopTooltip } from './StopTooltip'
import { StopEditingIndicators } from '@/components/collaboration/StopEditingIndicators'
import { useStopEditingPresence } from '@/hooks/useStopEditingPresence'
import { useAdvancedHaptics } from '@/hooks/useAdvancedHaptics'
import { useAudioFeedback } from '@/hooks/useAudioFeedback'
import { useNovaSnap } from '@/hooks/useNovaSnap'
import { VoteButtons } from '@/components/plans/VoteButtons'
import { usePlanStatusValidation } from '@/hooks/usePlanStatusValidation'
import { getSafeStatus } from '@/lib/planStatusConfig'
import { StopOverlayHint } from './StopOverlayHint'
import { StopActionsSheet } from './StopActionsSheet'
import { useLongPress } from '@/hooks/useLongPress'
import { useDeleteStop } from '@/hooks/useDeleteStop'
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import type { PlanStop, SnapSuggestion } from '@/types/plan'

interface ResizableStopCardProps {
  stop: PlanStop
  planId?: string
  planStatus?: string
  isSelected?: boolean
  isResizing?: boolean
  isDragOver?: boolean
  hasConflict?: boolean
  suggested?: boolean
  allStops?: PlanStop[]
  snapSuggestion?: SnapSuggestion
  onSelect?: (stopId: string, isMultiSelect?: boolean, isRangeSelect?: boolean) => void
  onStartResize?: (stopId: string, stop: PlanStop, clientY: number) => void
  onResize?: (clientY: number) => number | undefined
  onEndResize?: (clientY: number) => void
  onEdit?: () => void
  onRemove?: () => void
  className?: string
  style?: React.CSSProperties
}

export function ResizableStopCard({
  stop,
  planId,
  planStatus,
  isSelected = false,
  isResizing = false,
  isDragOver = false,
  hasConflict = false,
  suggested = false,
  allStops = [],
  snapSuggestion,
  onSelect,
  onStartResize,
  onResize,
  onEndResize,
  onEdit,
  onRemove,
  className,
  style
}: ResizableStopCardProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [previewDuration, setPreviewDuration] = useState<number | null>(null)
  const [showTooltip, setShowTooltip] = useState(false)
  const [showActionsSheet, setShowActionsSheet] = useState(false)
  const cardRef = useRef<HTMLDivElement>(null)
  const { isStopConflicting, getConflictForStop } = useStopConflictChecker(allStops)
  const updatePosition = useUpdateStopPosition()
  const { startEditing, stopEditing } = useStopEditingPresence({ planId: planId || '', enabled: !!planId })
  const { timelineHaptics } = useAdvancedHaptics()
  const { timelineAudio } = useAudioFeedback()
  const { recordNovaSnap } = useNovaSnap()
  const { canEditPlan } = usePlanStatusValidation()
  const { mutate: deleteStop } = useDeleteStop()

  const isConflicting = hasConflict || isStopConflicting(stop.id)
  const conflictInfo = getConflictForStop(stop.id)
  const duration = stop.duration_minutes || 60
  
  // Show voting only for finalized+ plans and when planId is available
  const showVoting = planId && planStatus && !['draft'].includes(planStatus)

  // Enhanced click handler - single tap to edit if no modifiers
  const handleClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget || (e.target as Element).closest('.resize-handle')) {
      return // Don't select when starting resize
    }
    
    timelineHaptics.stopDragStart()
    onSelect?.(stop.id, e.metaKey || e.ctrlKey, e.shiftKey)
    
    // If neither shift nor meta, this is a pure click - open edit modal
    if (!e.shiftKey && !e.metaKey) {
      const normalizedStatus = getSafeStatus(planStatus)
      if (canEditPlan(normalizedStatus)) {
        onEdit?.()
      }
    }
  }

  // Long press handler for action sheet
  const handleLongPress = () => {
    // Only trigger sheet if not currently dragging
    if (!isDragging) {
      setShowActionsSheet(true)
    }
  }

  // Long press gesture setup
  const longPressGestures = useLongPress({
    onLongPress: handleLongPress,
    delay: 350
  })

  const handleDoubleClick = () => {
    // Check if plan can be edited before allowing editing - normalize status with fallback
    const normalizedStatus = getSafeStatus(planStatus)
    if (!canEditPlan(normalizedStatus)) {
      return
    }
    
    startEditing(stop.id, 'editing')
    onEdit?.()
  }

  // Delete handler
  const handleDelete = () => {
    if (planId) {
      deleteStop({ planId, stopId: stop.id })
    } else {
      onRemove?.()
    }
  }

  const handleResizeStart = (e: React.MouseEvent) => {
    e.stopPropagation()
    
    // Check if plan can be edited before allowing resize - normalize status with fallback
    const normalizedStatus = getSafeStatus(planStatus)
    if (!canEditPlan(normalizedStatus)) {
      return
    }
    
    setIsDragging(true)
    timelineHaptics.stopResize()
    timelineAudio.stopResize()
    startEditing(stop.id, 'resizing')
    onStartResize?.(stop.id, stop, e.clientY)

    const handleMouseMove = (e: MouseEvent) => {
      const duration = onResize?.(e.clientY)
      setPreviewDuration(duration || null)
    }

    const handleMouseUp = (e: MouseEvent) => {
      setIsDragging(false)
      
      // Check if we're applying a snap suggestion for Nova tracking
      if (snapSuggestion && previewDuration && planId) {
        const confidenceScore = snapSuggestion.confidence || 0.8
        const originalTime = stop.start_time || ''
        const snappedTime = snapSuggestion.startTime || ''
        recordNovaSnap(planId, stop.id, confidenceScore, originalTime, snappedTime)
      }
      
      setPreviewDuration(null)
      timelineHaptics.stopDragEnd()
      timelineAudio.stopDrop()
      stopEditing(stop.id)
      onEndResize?.(e.clientY)
      
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }

  return (
    <motion.div
      ref={cardRef}
      layout
      {...longPressGestures}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      className={cn(
        'relative bg-card/90 backdrop-blur-xl rounded-2xl p-4 border transition-all duration-300 cursor-grab select-none',
        'hover:scale-[1.02] hover:shadow-lg',
        isSelected && 'ring-2 ring-primary shadow-primary/25',
        isDragOver && 'ring-2 ring-accent',
        isConflicting && 'border-destructive bg-destructive/10',
        suggested && 'ring-2 ring-yellow-400 bg-yellow-50/50',
        isResizing && 'cursor-row-resize',
        className
      )}
      style={{ 
        borderLeftColor: stop.color || 'hsl(var(--primary))', 
        borderLeftWidth: '4px',
        minHeight: `${Math.max(duration * 1.2, 60)}px`, // Dynamic height based on duration
        ...style
      }}
      role="listitem"
      aria-label={`Stop: ${stop.title}`}
      aria-describedby={showTooltip ? `tooltip-${stop.id}` : undefined}
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
    >
      {/* Visual Overlays */}
      <AnimatePresence>
        <ConflictGlow 
          isConflicting={isConflicting} 
          message={conflictInfo?.message}
        />
        <SnapSuggestionOverlay 
          show={!!snapSuggestion && !isConflicting} 
          suggestion={snapSuggestion}
        />
        <StopTooltip 
          id={`tooltip-${stop.id}`}
          timeRange={`${stop.start_time} - ${stop.end_time || formatTimeFromMinutes(timeToMinutes(stop.start_time || '') + duration)}`}
          isVisible={showTooltip && !isDragging}
          duration={duration}
        />
        {isConflicting && (
          <StopOverlayHint type="conflict" message="Time conflict detected" />
        )}
        {snapSuggestion && !isConflicting && (
          <StopOverlayHint type="snap" message="✨ Snapped to AI suggestion" />
        )}
      </AnimatePresence>

      {/* Collaboration Indicators */}
      {planId && (
        <StopEditingIndicators 
          planId={planId} 
          stopId={stop.id} 
        />
      )}
      {/* Conflict indicator */}
      {isConflicting && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-2 right-2 text-destructive"
        >
          <AlertTriangle className="w-4 h-4" />
        </motion.div>
      )}

      {/* Suggestion indicator */}
      {suggested && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute top-2 right-2 text-yellow-500"
        >
          <Sparkles className="w-4 h-4" />
        </motion.div>
      )}

      {/* Main content */}
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-foreground truncate text-lg">
            {stop.title}
          </h3>
          
          {stop.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {stop.description}
            </p>
          )}
          
          <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>
              {stop.start_time} - {stop.end_time || formatTimeFromMinutes(timeToMinutes(stop.start_time || '') + duration)}
            </span>
            <span className="px-2 py-1 bg-muted rounded">
              {duration}min
            </span>
          </div>
        </div>

        {/* Drag handle and dropdown menu */}
        <div className="flex items-center gap-1">
          {/* Dropdown Menu for Actions */}
          {!isDragging && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8 opacity-60 hover:opacity-100 transition-opacity"
                  aria-label="Stop actions"
                >
                  <MoreVertical className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent side="bottom" align="end">
                <DropdownMenuItem 
                  onSelect={() => {
                    const normalizedStatus = getSafeStatus(planStatus)
                    if (canEditPlan(normalizedStatus)) {
                      onEdit?.()
                    }
                  }}
                >
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem 
                  onSelect={handleDelete}
                  className="text-destructive"
                >
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* Drag handle */}
          <div 
            className="resize-handle cursor-grab hover:cursor-grabbing p-1 rounded hover:bg-muted/50"
            onMouseDown={handleResizeStart}
          >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </div>

      {/* Status indicators */}
      <div className="flex items-center justify-between mt-3">
        <div className="flex items-center gap-2">
          {stop.status && (
            <span className={cn(
              'px-2 py-1 text-xs font-medium rounded-full',
              stop.status === 'confirmed' && 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400',
              stop.status === 'suggested' && 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400',
              stop.status === 'pending' && 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400'
            )}>
              {stop.status}
            </span>
          )}
          
          {isConflicting && (
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-destructive/10 text-destructive">
              Conflict
            </span>
          )}
          
          {suggested && (
            <span className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400">
              Suggested
            </span>
          )}
        </div>

        {/* Voting buttons for finalized+ plans */}
        {showVoting && planId && (
          <VoteButtons 
            planId={planId}
            stopId={stop.id}
            planStatus={planStatus}
            size="sm"
            showCounts={true}
            className="mt-2"
          />
        )}

        {/* Duration preview during resize */}
        {previewDuration && (
          <motion.span
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            className="text-xs font-medium text-primary"
          >
            {previewDuration}min
          </motion.span>
        )}
      </div>

      {/* Action Sheet */}
      <StopActionsSheet
        stop={stop}
        open={showActionsSheet}
        onClose={() => setShowActionsSheet(false)}
        onEdit={() => {
          const normalizedStatus = getSafeStatus(planStatus)
          if (canEditPlan(normalizedStatus)) {
            onEdit?.()
          }
        }}
        onDelete={handleDelete}
      />
    </motion.div>
  )
}