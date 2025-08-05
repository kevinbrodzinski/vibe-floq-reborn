import { useState } from 'react'
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd'
import { DraggableStopCard } from './DraggableStopCard'
import { usePlanStops } from '@/hooks/usePlanStops'
import { useUpdateStopOrder } from '@/hooks/useUpdateStopOrder'
import { cn } from '@/lib/utils'
import type { PlanStop, PlanStopUi } from '@/types/plan'

interface DraggableTimelineGridProps {
  planId: string
  planStatus?: 'draft' | 'planning' | 'executing' | 'completed'
  onStopEdit?: (stop: PlanStopUi) => void
  onStopDelete?: (stopId: string) => void
}

export function DraggableTimelineGrid({
  planId,
  planStatus = 'draft',
  onStopEdit,
  onStopDelete
}: DraggableTimelineGridProps) {
  const [draggedStopId, setDraggedStopId] = useState<string | null>(null)
  const [dropZoneStopId, setDropZoneStopId] = useState<string | null>(null)
  
  const { data: stops = [], isLoading, error } = usePlanStops(planId)
  const updateStopOrder = useUpdateStopOrder()

  const handleDragStart = (start) => {
    setDraggedStopId(start.draggableId)
  }

  const handleDragUpdate = (update) => {
    if (update.destination) {
      setDropZoneStopId(update.destination.droppableId)
    }
  }

  const handleDragEnd = (result) => {
    setDraggedStopId(null)
    setDropZoneStopId(null)

    if (!result.destination) {
      return
    }

    const startIndex = stops.findIndex(stop => stop.id === result.draggableId)
    const endIndex = result.destination.index

    if (startIndex === endIndex) {
      return
    }

    const reorderedStops = Array.from(stops)
    const [removed] = reorderedStops.splice(startIndex, 1)
    reorderedStops.splice(endIndex, 0, removed)

    // Optimistically update the UI
    // setStops(reorderedStops)

    // Persist the changes to the database
    reorderedStops.forEach((stop, index) => {
      updateStopOrder.mutate({
        planId: planId,
        stopId: stop.id,
        newOrder: index
      })
    })
  }

  const handleStopEdit = (stop: PlanStop) => {
    if (onStopEdit) {
      onStopEdit(stop as unknown as PlanStopUi)
    }
  }

  const handleStopDelete = (stopId: string) => {
    if (onStopDelete) {
      onStopDelete(stopId)
    }
  }

  if (isLoading) {
    return <p>Loading...</p>
  }

  if (error) {
    return <p>Error: {error.message}</p>
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="timeline" type="STOP">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={cn(
              "space-y-3 min-h-[200px] p-4 rounded-lg transition-all duration-200",
              snapshot.isDraggingOver && "bg-muted/50 border-2 border-dashed border-primary"
            )}
          >
            {stops.map((stop, index) => (
              <Draggable key={stop.id} draggableId={stop.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    className={cn(
                      "transition-all duration-200",
                      snapshot.isDragging && "rotate-2 scale-105"
                    )}
                  >
                    <DraggableStopCard
                      stop={{
                        id: stop.id,
                        title: stop.title,
                        description: stop.description,
                        start_time: stop.start_time,
                        end_time: stop.end_time,
                        duration_minutes: stop.duration_minutes,
                        estimated_cost_per_person: stop.estimated_cost_per_person,
                        venue: typeof stop.venue === 'string' ? { id: '', name: stop.venue } : stop.venue
                      }}
                      planId={planId}
                      onEdit={() => handleStopEdit(stop)}
                      onDelete={() => handleStopDelete(stop.id)}
                      isDragging={snapshot.isDragging}
                    />
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  )
}
