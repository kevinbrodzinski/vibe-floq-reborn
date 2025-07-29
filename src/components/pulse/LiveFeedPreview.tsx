import { useLiveActivity } from '@/hooks/useLiveActivity';
import { pulseEventToLiveActivity } from '@/lib/pulse/formatEvent';
import { LiveActivityFeed } from '@/components/ui/LiveActivityFeed';

export const LiveFeedPreview = ({ max = 4 }: { max?: number }) => {
  const { data } = useLiveActivity();
  const items = data?.pages[0]?.slice(0, max) ?? [];
  
  // Convert PulseEvent to LiveActivity format
  const activities = items.map(pulseEventToLiveActivity);

  return (
    <LiveActivityFeed 
      activities={activities}
      maxItems={max}
      boldEntities={true}
    />
  );
}; 