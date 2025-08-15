import React, { useState } from 'react'
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { restrictToVerticalAxis } from '@dnd-kit/modifiers'
import { Card, CardContent } from '@/components/ui/card'
import { DraggableStopCard } from './DraggableStopCard'

interface TestStop {
  id: string
  title: string
  description: string
  start_time: string
  end_time: string
  venue?: {
    id: string
    name: string
  }
}

const mockStops: TestStop[] = [
  {
    id: 'stop-1',
    title: 'Coffee Shop',
    description: 'Start the day with great coffee',
    start_time: '09:00',
    end_time: '10:00',
    venue: { id: 'venue-1', name: 'Blue Bottle Coffee' }
  },
  {
    id: 'stop-2', 
    title: 'Museum Visit',
    description: 'Explore local art and culture',
    start_time: '11:00',
    end_time: '13:00',
    venue: { id: 'venue-2', name: 'Modern Art Museum' }
  },
  {
    id: 'stop-3',
    title: 'Lunch',
    description: 'Delicious local cuisine',
    start_time: '13:30',
    end_time: '15:00',
    venue: { id: 'venue-3', name: 'Local Bistro' }
  }
]

export function DragDropTestComponent() {
  const [stops, setStops] = useState(mockStops)
  const [draggedStopId, setDraggedStopId] = useState<string | null>(null)

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    setDraggedStopId(null)

    if (!over || active.id === over.id) {
      return
    }

    const oldIndex = stops.findIndex(stop => stop.id === active.id)
    const newIndex = stops.findIndex(stop => stop.id === over.id)

    if (oldIndex !== -1 && newIndex !== -1) {
      const newStops = [...stops]
      const [movedStop] = newStops.splice(oldIndex, 1)
      newStops.splice(newIndex, 0, movedStop)
      setStops(newStops)
    }
  }

  return (
    <div className="p-6 max-w-md mx-auto">
      <h2 className="text-xl font-semibold mb-4">Drag & Drop Test</h2>
      
      <DndContext
        onDragEnd={handleDragEnd}
        onDragStart={(event) => setDraggedStopId(event.active.id as string)}
        modifiers={[restrictToVerticalAxis]}
        collisionDetection={closestCenter}
      >
        <SortableContext items={stops.map(s => s.id)} strategy={verticalListSortingStrategy}>
          <div className="space-y-3">
            {stops.map((stop, index) => (
              <DraggableStopCard
                key={stop.id}
                stop={stop}
                planId="test-plan"
                onEdit={(stop) => console.log('Edit:', stop)}
                onDelete={(stopId) => console.log('Delete:', stopId)}
                isDragging={draggedStopId === stop.id}
                showQuickActions={false}
                compact={true}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      <div className="mt-6 p-4 bg-muted/50 rounded-lg">
        <h3 className="font-medium mb-2">Instructions:</h3>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li>• Drag the grip handle (⋮⋮) to reorder stops</li>
          <li>• Cards should show visual feedback when dragging</li>
          <li>• Order should persist after dropping</li>
        </ul>
      </div>
    </div>
  )
}