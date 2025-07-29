import { useLiveActivity } from '@/hooks/useLiveActivity';
import { pulseEventToLiveActivity } from '@/lib/pulse/formatEvent';
import { LiveActivityFeed } from '@/components/ui/LiveActivityFeed';
import { useRef, useEffect } from 'react';
import type { PulseEvent } from '@/types/pulse';

export const LiveFeedFull = () => {
  const { data, fetchNextPage, hasNextPage, isFetching } = useLiveActivity(0, 0, 1);
  const feed = data?.pages.flat() ?? [];
  
  // Convert PulseEvent to LiveActivity format
  const activities = feed.map((ev: any) => pulseEventToLiveActivity(ev as PulseEvent)) as any[];

  const bottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!bottomRef.current) return;
    const io = new IntersectionObserver((e) => {
      if (e[0].isIntersecting && hasNextPage && !isFetching) fetchNextPage();
    });
    io.observe(bottomRef.current);
    return () => io.disconnect();
  }, [bottomRef, hasNextPage, isFetching, fetchNextPage]);

  return (
    <div className="h-full overflow-y-auto p-4">
      <LiveActivityFeed 
        activities={activities}
        maxItems={activities.length} // Show all items
        boldEntities={true}
      />
      <div ref={bottomRef} />
      {isFetching && <p className="text-center text-xs text-muted mt-4">loading…</p>}
    </div>
  );
}; 