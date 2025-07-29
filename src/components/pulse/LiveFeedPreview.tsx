import { useLiveActivity } from '@/hooks/useLiveActivity';
import { pulseEventToLiveActivity } from '@/lib/pulse/formatEvent';
import { LiveActivityFeed } from '@/components/ui/LiveActivityFeed';
import type { PulseEvent } from '@/types/pulse';

export const LiveFeedPreview = ({ max = 4 }: { max?: number }) => {
  const { data } = useLiveActivity();
  const items = (data?.pages[0] as any[])?.slice(0, max) ?? [];
  
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