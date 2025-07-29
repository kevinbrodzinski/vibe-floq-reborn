import type { PulseEvent } from '@/types/pulse';

export function formatEvent(ev: PulseEvent, meName = 'You') {
  switch (ev.event_type) {
    case 'check_in':
      return `${ev.meta?.actor_name ?? meName} checked-in at ${ev.meta?.venue_name}`;
    case 'vibe_join':
      return `${ev.people_count} new people joined the vibe at ${ev.meta?.venue_name}`;
    case 'floq_join':
      return `${ev.meta?.actor_name ?? meName} joined a floq at ${ev.meta?.venue_name}`;
    default:
      return 'Unknown event';
  }
}

// Convert PulseEvent to LiveActivity format for existing UI components
export function pulseEventToLiveActivity(ev: PulseEvent): {
  id: string;
  type: 'checkin' | 'venue_activity' | 'friend_joined' | 'trending' | 'floq_activity' | 'vibe_activity';
  user_name?: string;
  venue_name: string;
  activity_text: string;
  timestamp: string;
  avatar_url?: string;
  vibe?: string;
  venue_id?: string;
} {
  const getActivityType = (eventType: string): 'checkin' | 'venue_activity' | 'friend_joined' | 'trending' | 'floq_activity' | 'vibe_activity' => {
    switch (eventType) {
      case 'check_in':
      case 'check_out':
        return 'checkin';
      case 'vibe_join':
      case 'vibe_leave':
        return 'vibe_activity';
      case 'floq_join':
      case 'floq_leave':
        return 'floq_activity';
      default:
        return 'venue_activity';
    }
  };

  return {
    id: ev.id.toString(),
    type: getActivityType(ev.event_type),
    user_name: ev.meta?.actor_name,
    venue_name: ev.meta?.venue_name || 'Unknown venue',
    activity_text: formatEvent(ev),
    timestamp: new Date(ev.created_at).toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit' 
    }),
    avatar_url: ev.meta?.actor_avatar,
    vibe: ev.vibe_tag,
    venue_id: ev.venue_id
  };
} 