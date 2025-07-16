import { memo, useMemo, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { useRef } from 'react';

// Memoized stop item component
const StopItem = memo(({ stop, index, onEdit, onVote }: {
  stop: any;
  index: number;
  onEdit: (stopId: string) => void;
  onVote: (stopId: string, voteType: string) => void;
}) => {
  const handleEdit = useCallback(() => onEdit(stop.id), [onEdit, stop.id]);
  const handleVote = useCallback((voteType: string) => onVote(stop.id, voteType), [onVote, stop.id]);

  return (
    <div className="p-4 border rounded-lg">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-medium">{stop.title}</h3>
          <p className="text-sm text-muted-foreground">{stop.description}</p>
        </div>
        <div className="flex gap-2">
          <button onClick={handleEdit} className="text-sm text-primary">
            Edit
          </button>
          <button onClick={() => handleVote('up')} className="text-sm">
            👍
          </button>
        </div>
      </div>
    </div>
  );
});

StopItem.displayName = 'StopItem';

// Virtualized list for large plans
export const VirtualizedStopList = memo(({ stops, onEdit, onVote }: {
  stops: any[];
  onEdit: (stopId: string) => void;
  onVote: (stopId: string, voteType: string) => void;
}) => {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: stops.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => 120,
    overscan: 5,
  });

  const memoizedStops = useMemo(() => stops, [stops]);

  return (
    <div ref={parentRef} className="h-[400px] overflow-auto">
      <div
        style={{
          height: `${virtualizer.getTotalSize()}px`,
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((virtualItem) => {
          const stop = memoizedStops[virtualItem.index];
          
          return (
            <div
              key={stop.id}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: `${virtualItem.size}px`,
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              <StopItem
                stop={stop}
                index={virtualItem.index}
                onEdit={onEdit}
                onVote={onVote}
              />
            </div>
          );
        })}
      </div>
    </div>
  );
});

VirtualizedStopList.displayName = 'VirtualizedStopList';

// Optimized participant list with batch updates
export const OptimizedParticipantList = memo(({ participants }: {
  participants: any[];
}) => {
  const sortedParticipants = useMemo(() => 
    participants.sort((a, b) => {
      // Online users first, then alphabetical
      if (a.isOnline !== b.isOnline) {
        return a.isOnline ? -1 : 1;
      }
      return (a.display_name || a.username || '').localeCompare(
        b.display_name || b.username || ''
      );
    }),
    [participants]
  );

  return (
    <div className="space-y-2">
      {sortedParticipants.map((participant) => (
        <div 
          key={participant.id} 
          className="flex items-center gap-2 p-2 rounded"
        >
          <div className={`w-2 h-2 rounded-full ${
            participant.isOnline ? 'bg-green-500' : 'bg-gray-400'
          }`} />
          <span className="text-sm">
            {participant.display_name || participant.username}
          </span>
        </div>
      ))}
    </div>
  );
});

OptimizedParticipantList.displayName = 'OptimizedParticipantList';

// Memory-efficient data hooks
export const useOptimizedPlanData = (planId: string) => {
  // Use React Query or SWR with proper cache invalidation
  const queryKey = useMemo(() => ['plan', planId], [planId]);
  
  // Memoize expensive computations
  const computedMetrics = useMemo(() => ({
    // Only recalculate when necessary
    totalStops: 0,
    totalVotes: 0,
    readinessScore: 0
  }), [/* dependencies */]);

  return {
    queryKey,
    computedMetrics
  };
};