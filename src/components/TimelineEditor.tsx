import { useState } from 'react';
import { StopCard } from './StopCard';
import { AddStopButton } from './AddStopButton';
import { StopEditModal } from './StopEditModal';
import { usePlanStops } from '@/hooks/usePlanStops';
import { usePlanSync } from '@/hooks/usePlanSync';
import { type PlanStop } from '@/types/plan';

interface TimelineEditorProps {
  planId: string;
  isEditable?: boolean;
  onStopSelect?: (stopId: string) => void;
  selectedStopId?: string;
}

export const TimelineEditor = ({
  planId,
  isEditable = true,
  onStopSelect,
  selectedStopId
}: TimelineEditorProps) => {
  const [editingStop, setEditingStop] = useState<any | null>(null);
  const [draggedStop, setDraggedStop] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);

  const { data: stops = [], isLoading } = usePlanStops(planId);
  const { mutate: syncChanges } = usePlanSync();

  const timeSlots = [
    '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', 
    '21:00', '21:30', '22:00', '22:30', '23:00', '23:30'
  ];

  const handleDragStart = (e: React.DragEvent, stop: PlanStop) => {
    if (!isEditable) return;
    setDraggedStop(stop.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    if (!isEditable) return;
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDrop = (e: React.DragEvent, targetIndex: number) => {
    e.preventDefault();
    
    if (!draggedStop) return;

    const draggedIndex = stops.findIndex(s => s.id === draggedStop);
    if (draggedIndex === -1 || draggedIndex === targetIndex) return;

    // Reorder stops
    const reorderedStops = [...stops];
    const [movedStop] = reorderedStops.splice(draggedIndex, 1);
    reorderedStops.splice(targetIndex, 0, movedStop);

    // Update stop_order for all affected stops
    const updates = reorderedStops.map((stop, index) => ({
      id: stop.id,
      stop_order: index
    }));

    syncChanges({
      plan_id: planId,
      changes: {
        type: 'reorder_stops',
        data: { updates }
      }
    });

    setDraggedStop(null);
    setDragOverIndex(null);
  };

  const handleAddStop = (timeSlot: string) => {
    // Create new stop at this time slot
    const newOrder = stops.length;
    syncChanges({
      plan_id: planId,
      changes: {
        type: 'update_stop',
        data: {
          title: 'New Stop',
          start_time: timeSlot,
          stop_order: newOrder
        }
      }
    });
  };

  const handleStopEdit = (stop: PlanStop) => {
    setEditingStop(stop);
  };

  const handleStopRemove = (stopId: string) => {
    syncChanges({
      plan_id: planId,
      changes: {
        type: 'update_stop',
        data: { id: stopId, deleted: true }
      }
    });
  };

  const handleVote = (stopId: string, voteType: 'yes' | 'no' | 'maybe') => {
    // Vote logic handled by VotePanel internally
    console.log('Vote:', stopId, voteType);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Timeline header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Timeline</h3>
        <div className="text-sm text-muted-foreground">
          {stops.length} stops planned
        </div>
      </div>

      {/* Timeline content */}
      <div className="space-y-3">
        {timeSlots.map((timeSlot, index) => {
          const stopAtTime = stops.find(stop => 
            stop.start_time?.startsWith(timeSlot)
          );

          return (
            <div
              key={timeSlot}
              className="relative"
              onDragOver={(e) => handleDragOver(e, index)}
              onDrop={(e) => handleDrop(e, index)}
            >
              {/* Time label */}
              <div className="flex items-center gap-4">
                <div className="w-16 text-sm font-medium text-muted-foreground">
                  {timeSlot}
                </div>
                
                <div className="flex-1">
                  {stopAtTime ? (
                    <StopCard
                      key={stopAtTime.id}
                      stop={stopAtTime}
                      isSelected={selectedStopId === stopAtTime.id}
                      isDragOver={dragOverIndex === index}
                      onSelect={() => onStopSelect?.(stopAtTime.id)}
                      onEdit={() => handleStopEdit(stopAtTime)}
                      onRemove={() => handleStopRemove(stopAtTime.id)}
                      onVote={(voteType) => handleVote(stopAtTime.id, voteType)}
                      onDragStart={(e) => handleDragStart(e, stopAtTime)}
                      draggable={isEditable}
                    />
                  ) : (
                    <AddStopButton
                      timeSlot={timeSlot}
                      onAdd={handleAddStop}
                      isDragOver={dragOverIndex === index}
                      disabled={!isEditable}
                    />
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Edit modal */}
      {editingStop && (
        <StopEditModal
          stop={editingStop}
          onClose={() => setEditingStop(null)}
          onSave={(updates) => {
            syncChanges({
              plan_id: planId,
              changes: {
                type: 'update_stop',
                data: { id: editingStop.id, ...updates }
              }
            });
            setEditingStop(null);
          }}
        />
      )}
    </div>
  );
};