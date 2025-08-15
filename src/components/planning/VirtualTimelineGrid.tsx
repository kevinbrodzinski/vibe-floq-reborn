import React, { useRef, useEffect, memo } from 'react';
import { motion } from 'framer-motion';
import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { StopCard } from '@/components/StopCard';
import { AddStopButton } from '@/components/AddStopButton';
import { SwipeableStopCard } from '@/components/ui/SwipeableStopCard';
import { useVirtualTimeline, useTimelinePerformance } from '@/hooks/useVirtualTimeline';
import { useUnifiedPlanStops } from '@/hooks/useUnifiedPlanStops';
import type { PlanStop } from '@/types/plan';

interface VirtualTimelineGridProps {
  planId: string;
  planStatus: string;
  startTime: string;
  endTime: string;
  stops: PlanStop[];
  onStopReorder: (activeId: string, overId: string) => void;
  onStopSelect: (stopId: string) => void;
  onAddStop: (timeSlot: string) => void;
  enableSwipeGestures?: boolean;
  enableVirtualization?: boolean;
}

// Memoized timeline item component for better performance
const TimelineItem = memo(({ 
  timeSlot, 
  stop, 
  onAddStop, 
  onStopSelect, 
  planStatus, 
  enableSwipeGestures 
}: {
  timeSlot: string;
  stop?: PlanStop;
  onAddStop: (timeSlot: string) => void;
  onStopSelect: (stopId: string) => void;
  planStatus: string;
  enableSwipeGestures: boolean;
}) => {
  const { deleteStop } = useUnifiedPlanStops();

  const handleEdit = () => {
    if (stop) {
      console.log('Edit stop:', stop.id);
      // TODO: Open edit modal
    }
  };

  const handleDelete = () => {
    if (stop) {
      deleteStop.mutate(stop.id);
    }
  };

  const handleLongPress = () => {
    if (stop) {
      console.log('Long press on stop:', stop.id);
      // TODO: Show context menu
    }
  };

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      className="space-y-2"
    >
      {/* Time Label */}
      <div className="flex items-center gap-3">
        <div className="min-w-[80px] flex items-center gap-2 text-sm font-medium text-muted-foreground bg-card/30 rounded-lg px-2 py-1">
          <Clock className="w-5 h-5" />
          {timeSlot}
        </div>
        
        <div className="flex-1">
          {stop ? (
            enableSwipeGestures ? (
              <SwipeableStopCard
                stop={stop}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onSelect={() => onStopSelect(stop.id)}
                onLongPress={handleLongPress}
              />
            ) : (
              <StopCard
                stop={stop}
                isSelected={false}
                onSelect={() => onStopSelect(stop.id)}
                onEdit={handleEdit}
                onRemove={handleDelete}
                draggable={planStatus === 'draft'}
              />
            )
          ) : (
            <AddStopButton
              timeSlot={timeSlot}
              onAdd={onAddStop}
              disabled={planStatus !== 'draft'}
            />
          )}
        </div>
      </div>
    </motion.div>
  );
});

TimelineItem.displayName = 'TimelineItem';

export function VirtualTimelineGrid({
  planId,
  planStatus,
  startTime,
  endTime,
  stops,
  onStopReorder,
  onStopSelect,
  onAddStop,
  enableSwipeGestures = true,
  enableVirtualization = true
}: VirtualTimelineGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { metrics, measureRender } = useTimelinePerformance();

  // Generate time slots (every 30 minutes)
  const timeSlots = React.useMemo(() => {
    const slots: string[] = [];
    const start = parseInt(startTime.split(':')[0]);
    const end = parseInt(endTime.split(':')[0]);
    
    for (let hour = start; hour <= end; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      if (hour < end) {
        slots.push(`${hour.toString().padStart(2, '0')}:30`);
      }
    }
    return slots;
  }, [startTime, endTime]);

  // Virtual scrolling setup
  const {
    virtualItems,
    totalHeight,
    handleScroll,
    scrollToStop
  } = useVirtualTimeline(timeSlots, stops, {
    itemHeight: 120, // Approximate height per timeline item
    containerHeight: 600, // Container height
    overscan: 3
  });

  // Scroll to current time on mount
  useEffect(() => {
    const now = new Date();
    const currentTime = `${now.getHours().toString().padStart(2, '0')}:${Math.floor(now.getMinutes() / 30) * 30}`;
    const currentTimeSlot = timeSlots.find(slot => slot >= currentTime);
    
    if (currentTimeSlot && containerRef.current) {
      const index = timeSlots.indexOf(currentTimeSlot);
      containerRef.current.scrollTop = index * 120;
    }
  }, [timeSlots]);

  const renderContent = () => {
    if (enableVirtualization && timeSlots.length > 20) {
      // Use virtual scrolling for long timelines
      return (
        <div
          ref={containerRef}
          className="flex-1 overflow-y-auto p-4"
          onScroll={handleScroll}
          style={{ height: '600px' }}
        >
          <div style={{ height: totalHeight, position: 'relative' }}>
            {virtualItems.map((item) => (
              <div
                key={item.timeSlot}
                style={{
                  position: 'absolute',
                  top: item.offsetTop,
                  left: 0,
                  right: 0,
                  height: 120
                }}
              >
                <TimelineItem
                  timeSlot={item.timeSlot}
                  stop={item.stop}
                  onAddStop={onAddStop}
                  onStopSelect={onStopSelect}
                  planStatus={planStatus}
                  enableSwipeGestures={enableSwipeGestures}
                />
              </div>
            ))}
          </div>
        </div>
      );
    } else {
      // Regular rendering for short timelines
      return (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {timeSlots.map((timeSlot) => {
            const stopAtTime = stops.find(stop => 
              stop.start_time?.startsWith(timeSlot)
            );

            return (
              <TimelineItem
                key={timeSlot}
                timeSlot={timeSlot}
                stop={stopAtTime}
                onAddStop={onAddStop}
                onStopSelect={onStopSelect}
                planStatus={planStatus}
                enableSwipeGestures={enableSwipeGestures}
              />
            );
          })}
        </div>
      );
    }
  };

  return (
    <div className="h-full flex flex-col bg-background">
      {/* Header */}
      <div className="p-4 border-b border-border/10">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Timeline</h2>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-xs px-3 py-1">
              {stops.length} {stops.length === 1 ? 'stop' : 'stops'}
            </Badge>
            
            {/* Performance indicator (dev mode) */}
            {process.env.NODE_ENV === 'development' && metrics.renderTime > 0 && (
              <Badge variant="secondary" className="text-xs">
                {metrics.renderTime.toFixed(1)}ms
              </Badge>
            )}
          </div>
        </div>
      </div>

      {/* Timeline Content */}
      {measureRender(renderContent)}
    </div>
  );
}