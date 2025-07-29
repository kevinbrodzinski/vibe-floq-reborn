import { useLiveActivity } from '@/hooks/useLiveActivity';
import { pulseEventToLiveActivity } from '@/lib/pulse/formatEvent';
import { LiveActivityFeed } from '@/components/ui/LiveActivityFeed';
import { flatInfinite } from '@/lib/flatInfinite';
import type { PulseEvent } from '@/types/pulse';

export const LiveFeedPreview = ({ max = 4 }: { max?: number }) => {
  const { data: livePages } = useLiveActivity();
  
  // Always get a flat array
  const liveEvents = flatInfinite<PulseEvent[]>(livePages);
  const items = liveEvents.flat().slice(0, max);
  
  // Convert PulseEvent to LiveActivity format
  const activities = items.map((ev: any) => pulseEventToLiveActivity(ev as PulseEvent)) as any[];

  return (
    <LiveActivityFeed 
      activities={activities}
      maxItems={max}
      boldEntities={true}
    />
  );
};