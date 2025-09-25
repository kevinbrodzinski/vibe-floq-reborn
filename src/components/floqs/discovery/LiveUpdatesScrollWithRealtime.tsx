import * as React from "react";
import { LiveUpdatesScroll } from "./LiveUpdatesScroll";
import { useFloqRealtime } from "@/hooks/useFloqRealtime";

interface LiveUpdatesScrollWithRealtimeProps {
  floqId: string;
  maxHeight?: string;
  showTimestamps?: boolean;
}

export function LiveUpdatesScrollWithRealtime({ 
  floqId, 
  maxHeight, 
  showTimestamps 
}: LiveUpdatesScrollWithRealtimeProps) {
  const { realtimeData } = useFloqRealtime(floqId);
  const { recent_activity } = realtimeData;
  
  // Convert realtime data to display format
  const updates = React.useMemo(() => 
    recent_activity.map(activity => ({
      id: `${activity.profile_id}-${activity.timestamp}`,
      type: activity.type === 'join' ? 'commit' as const :
            activity.type === 'leave' ? 'leave' as const :
            activity.type === 'message' ? 'energy' as const :
            'vibe_shift' as const,
      message: activity.type === 'message' 
        ? `💬 ${activity.metadata?.preview || 'sent a message'}` 
        : activity.type === 'join' 
          ? `✨ ${activity.profile_id.slice(0, 8)} just joined`
          : activity.type === 'leave'
            ? `👋 ${activity.profile_id.slice(0, 8)} left the floq`
            : `⚡ Decision made`,
      timestamp: new Date(activity.timestamp).getTime(),
      urgent: activity.type === 'join'
    })),
    [recent_activity]
  );
  
  return (
    <LiveUpdatesScroll 
      updates={updates}
      maxHeight={maxHeight}
      showTimestamps={showTimestamps}
    />
  );
}