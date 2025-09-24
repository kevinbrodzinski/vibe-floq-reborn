
import React, { useState } from 'react';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragOverlay,
  DragStartEvent,
} from '@dnd-kit/core';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { restrictToVerticalAxis } from '@dnd-kit/modifiers';
import { DraggableStopCard } from './DraggableStopCard';
import { zIndex } from '@/constants/z';

interface Stop {
  id: string;
  title: string;
  location: string;
  time: string;
  duration?: string;
  type?: 'venue' | 'activity' | 'transport';
  status?: 'confirmed' | 'tentative' | 'cancelled';
}

interface DraggableTimelineGridProps {
  stops: Stop[];
  onReorder: (newOrder: Stop[]) => void;
  onEditStop?: (stop: Stop) => void;
  onDeleteStop?: (stopId: string) => void;
  selectedStops?: string[];
  onSelectStop?: (stopId: string) => void;
  className?: string;
}

export const DraggableTimelineGrid: React.FC<DraggableTimelineGridProps> = ({
  stops,
  onReorder,
  onEditStop,
  onDeleteStop,
  selectedStops = [],
  onSelectStop,
  className = ""
}) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = stops.findIndex((stop) => stop.id === active.id);
      const newIndex = stops.findIndex((stop) => stop.id === over.id);
      
      const newOrder = arrayMove(stops, oldIndex, newIndex);
      onReorder(newOrder);
    }
  };

  const activeStop = activeId ? stops.find(stop => stop.id === activeId) : null;

  return (
    <div className={`space-y-3 ${className}`}>
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis]}
      >
        <SortableContext items={stops.map(stop => stop.id)} strategy={verticalListSortingStrategy}>
          {stops.map((stop) => (
            <DraggableStopCard
              key={stop.id}
              stop={stop}
              onEdit={onEditStop}
              onDelete={onDeleteStop}
              isSelected={selectedStops.includes(stop.id)}
              onSelect={onSelectStop}
              className="group"
            />
          ))}
        </SortableContext>

        <DragOverlay>
          {activeStop && (
            <div style={zIndex('modal').style}>
              <DraggableStopCard 
                stop={activeStop}
                className="transform rotate-2 shadow-2xl"
              />
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  );
};
