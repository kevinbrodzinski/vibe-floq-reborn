import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { VenueSelect } from '@/components/venue-select';
import { Badge } from '@/components/ui/badge';
import { Plus, MapPin, Clock, DollarSign, GripVertical, X } from 'lucide-react';
import { formatTime, formatCurrency } from '@/lib/format';
import { DndContext, DragEndEvent, closestCenter } from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { useTransitTime, calculateHaversineTime } from '@/hooks/useTransitTimes';
import { TransitIndicator } from './TransitIndicator';

interface Venue {
  id: string;
  label: string;
  description?: string;
  lat?: number;
  lng?: number;
}

interface PlanStop {
  id: string;
  title: string;
  venue: Venue | null;
  description?: string;
  start_time: string;
  duration_minutes: number;
  estimated_cost_per_person?: number;
  stop_order: number;
}

interface VenueStopStepProps {
  stops: PlanStop[];
  onChange: (stops: PlanStop[]) => void;
  onNext: () => void;
  onBack: () => void;
  startTime: string;
}

const SortableStopCard: React.FC<{
  stop: PlanStop;
  onUpdate: (stop: PlanStop) => void;
  onRemove: (id: string) => void;
  isFirst: boolean;
}> = ({ stop, onUpdate, onRemove, isFirst }) => {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: stop.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <Card 
      ref={setNodeRef} 
      style={style} 
      className={`p-4 space-y-3 ${isDragging ? 'shadow-lg' : ''}`}
    >
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-2">
          <div 
            {...attributes} 
            {...listeners}
            className="cursor-grab active:cursor-grabbing p-1 hover:bg-muted rounded"
          >
            <GripVertical className="w-4 h-4 text-muted-foreground" />
          </div>
          <Badge variant="outline" className="text-xs">
            Stop {stop.stop_order}
          </Badge>
          <div className="text-xs text-muted-foreground">
            {formatTime(stop.start_time)}
          </div>
        </div>
        
        {!isFirst && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onRemove(stop.id)}
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
          >
            <X className="w-4 h-4" />
          </Button>
        )}
      </div>

      <div className="space-y-3">
        <div>
          <Label htmlFor={`title-${stop.id}`} className="text-sm">Stop Title</Label>
          <Input
            id={`title-${stop.id}`}
            value={stop.title}
            onChange={(e) => onUpdate({ ...stop, title: e.target.value })}
            placeholder="What's happening here?"
            className="mt-1"
          />
        </div>

        <div>
          <Label className="text-sm">Venue</Label>
          <VenueSelect
            value={stop.venue}
            onChange={(venue) => onUpdate({ ...stop, venue })}
            className="mt-1"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <Label htmlFor={`duration-${stop.id}`} className="text-sm">Duration (min)</Label>
            <Input
              id={`duration-${stop.id}`}
              type="number"
              value={stop.duration_minutes}
              onChange={(e) => onUpdate({ ...stop, duration_minutes: parseInt(e.target.value) || 0 })}
              placeholder="60"
              className="mt-1"
            />
          </div>
          
          <div>
            <Label htmlFor={`cost-${stop.id}`} className="text-sm">Cost per person ($)</Label>
            <Input
              id={`cost-${stop.id}`}
              type="number"
              value={stop.estimated_cost_per_person || ''}
              onChange={(e) => onUpdate({ 
                ...stop, 
                estimated_cost_per_person: e.target.value ? parseFloat(e.target.value) : undefined 
              })}
              placeholder="25"
              className="mt-1"
            />
          </div>
        </div>

        <div>
          <Label htmlFor={`description-${stop.id}`} className="text-sm">Description (optional)</Label>
          <Textarea
            id={`description-${stop.id}`}
            value={stop.description || ''}
            onChange={(e) => onUpdate({ ...stop, description: e.target.value })}
            placeholder="Add details about this stop..."
            className="mt-1 min-h-[60px]"
          />
        </div>
      </div>
    </Card>
  );
};

export function VenueStopStep({ stops, onChange, onNext, onBack, startTime }: VenueStopStepProps) {
  // Default transit time for calculation when no real data is available
  const defaultTransitMinutes = 15;

  const calculateStopTimes = (stopsToCalculate: PlanStop[], baseStartTime: string) => {
    let currentTime = new Date(`2000-01-01T${baseStartTime}:00`);
    
    return stopsToCalculate.map((stop, index) => {
      const stopStartTime = currentTime.toTimeString().slice(0, 5);
      currentTime.setMinutes(currentTime.getMinutes() + stop.duration_minutes);
      
      // Add transit time to next stop (except for last stop)
      if (index < stopsToCalculate.length - 1) {
        currentTime.setMinutes(currentTime.getMinutes() + defaultTransitMinutes);
      }
      
      return {
        ...stop,
        start_time: stopStartTime,
        stop_order: index + 1
      };
    });
  };

  const handleStopUpdate = (updatedStop: PlanStop) => {
    const updatedStops = stops.map(stop => 
      stop.id === updatedStop.id ? updatedStop : stop
    );
    
    // Recalculate times when duration changes
    const recalculatedStops = calculateStopTimes(updatedStops, startTime);
    onChange(recalculatedStops);
  };

  const handleAddStop = () => {
    const newStop: PlanStop = {
      id: crypto.randomUUID(),
      title: '',
      venue: null,
      start_time: '',
      duration_minutes: 60,
      stop_order: stops.length + 1
    };
    
    const newStops = [...stops, newStop];
    const recalculatedStops = calculateStopTimes(newStops, startTime);
    onChange(recalculatedStops);
  };

  const handleRemoveStop = (stopId: string) => {
    const filteredStops = stops.filter(stop => stop.id !== stopId);
    const recalculatedStops = calculateStopTimes(filteredStops, startTime);
    onChange(recalculatedStops);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    
    if (active.id !== over?.id) {
      const oldIndex = stops.findIndex(stop => stop.id === active.id);
      const newIndex = stops.findIndex(stop => stop.id === over?.id);
      
      const reorderedStops = arrayMove(stops, oldIndex, newIndex);
      const recalculatedStops = calculateStopTimes(reorderedStops, startTime);
      onChange(recalculatedStops);
    }
  };

  const totalDuration = stops.reduce((acc, stop) => acc + stop.duration_minutes, 0);
  const totalCost = stops.reduce((acc, stop) => acc + (stop.estimated_cost_per_person || 0), 0);
  const transitTime = Math.max(0, stops.length - 1) * defaultTransitMinutes;

  const canProceed = stops.every(stop => stop.title.trim() && stop.venue) && stops.length > 0;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <Card className="p-4 bg-muted/30">
        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <div className="text-lg font-semibold">{stops.length}</div>
            <div className="text-xs text-muted-foreground">Stops</div>
          </div>
          <div>
            <div className="text-lg font-semibold">
              {Math.round((totalDuration + transitTime) / 60 * 10) / 10}h
            </div>
            <div className="text-xs text-muted-foreground">Total Duration</div>
          </div>
          <div>
            <div className="text-lg font-semibold">
              {totalCost > 0 ? formatCurrency(totalCost) : '—'}
            </div>
            <div className="text-xs text-muted-foreground">Per Person</div>
          </div>
        </div>
      </Card>

      {/* Stops List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium">Plan Your Stops</h3>
          <Badge variant="outline" className="text-xs">
            Starts at {formatTime(startTime)}
          </Badge>
        </div>

        <DndContext
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={stops.map(stop => stop.id)}
            strategy={verticalListSortingStrategy}
          >
            <div className="space-y-3">
              {stops.map((stop, index) => (
                <div key={stop.id} className="relative">
                  <SortableStopCard
                    stop={stop}
                    onUpdate={handleStopUpdate}
                    onRemove={handleRemoveStop}
                    isFirst={index === 0}
                  />
                  
                  {/* Real-time transit indicator */}
                  {index < stops.length - 1 && (
                    <TransitIndicator
                      from={{
                        lat: stop.venue?.lat,
                        lng: stop.venue?.lng
                      }}
                      to={{
                        lat: stops[index + 1]?.venue?.lat,
                        lng: stops[index + 1]?.venue?.lng
                      }}
                      mode="walking"
                      fallbackMinutes={defaultTransitMinutes}
                    />
                  )}
                </div>
              ))}
            </div>
          </SortableContext>
        </DndContext>

        <Button
          variant="outline"
          onClick={handleAddStop}
          className="w-full h-12 border-dashed"
        >
          <Plus className="w-4 h-4 mr-2" />
          Add Another Stop
        </Button>
      </div>

      {/* Navigation */}
      <div className="flex gap-3 pt-4">
        <Button variant="outline" onClick={onBack} className="flex-1">
          Back
        </Button>
        <Button 
          onClick={onNext} 
          disabled={!canProceed}
          className="flex-1"
        >
          Next: Review Plan
        </Button>
      </div>
    </div>
  );
}