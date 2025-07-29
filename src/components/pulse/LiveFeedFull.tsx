import { useLiveActivity } from '@/hooks/useLiveActivity';
import { pulseEventToLiveActivity } from '@/lib/pulse/formatEvent';
import { LiveActivityFeed } from '@/components/ui/LiveActivityFeed';
import { useRef, useEffect } from 'react';
import type { PulseEvent } from '@/types/pulse';

export const LiveFeedFull = () => {
  const { data: feed = [] } = useLiveActivity();
  
  // Convert PulseEvent to LiveActivity format
  const activities = feed.map((ev: any) => pulseEventToLiveActivity(ev as PulseEvent)) as any[];

  const bottomRef = useRef<HTMLDivElement>(null);

  return (
    <div className="h-full overflow-y-auto p-4">
      <LiveActivityFeed 
        activities={activities}
        maxItems={activities.length} // Show all items
        boldEntities={true}
      />
      <div ref={bottomRef} />
    </div>
  );
};