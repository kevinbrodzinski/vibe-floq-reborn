import { useLiveActivity } from '@/hooks/useLiveActivity';
import { pulseEventToLiveActivity } from '@/lib/pulse/formatEvent';
import { LiveActivityFeed } from '@/components/ui/LiveActivityFeed';
import type { PulseEvent } from '@/types/pulse';

export const LiveFeedPreview = ({ max = 4 }: { max?: number }) => {
  const { data: liveEvents = [] } = useLiveActivity();
  
  // Convert PulseEvent to LiveActivity format
  const activities = liveEvents
    .slice(0, max)
    .map((ev: any) => pulseEventToLiveActivity(ev as PulseEvent)) as any[];

  return (
    <LiveActivityFeed 
      activities={activities}
      maxItems={max}
      boldEntities={true}
    />
  );
};