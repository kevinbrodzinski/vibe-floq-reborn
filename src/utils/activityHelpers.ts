import { 
  CalendarClock, 
  MessageCircle, 
  Pencil, 
  UserPlus, 
  UserMinus, 
  Crown, 
  Zap, 
  Activity, 
  MapPin, 
  Users, 
  X, 
  Trash2, 
  Rocket, 
  Mail 
} from 'lucide-react';
import type { MergedActivity, isPlanActivity } from '@/hooks/useFloqActivity';

const planIcons = {
  created: CalendarClock,
  edited: Pencil,
  commented: MessageCircle
};

const historyIcons = {
  joined: UserPlus,
  left: UserMinus,
  created: Crown,
  vibe_changed: Zap,
  activity_detected: Activity,
  location_changed: MapPin,
  merged: Users,
  split: Users,
  ended: X,
  deleted: Trash2,
  boosted: Rocket,
  plan_created: CalendarClock,
  invited: Mail
};

const planActionText = {
  created: 'created a plan',
  edited: 'updated a plan', 
  commented: 'commented on a plan'
};

function getHistoryActionText(eventType: string, metadata?: any): string {
  switch (eventType) {
    case 'joined':
      return 'joined the floq';
    case 'left':
      return 'left the floq';
    case 'created':
      return 'created this floq';
    case 'vibe_changed':
      const newVibe = metadata?.new_vibe;
      return newVibe ? `changed vibe to ${newVibe}` : 'changed the vibe';
    case 'activity_detected':
      return 'is active';
    case 'location_changed':
      return 'moved location';
    case 'merged':
      return 'merged this floq';
    case 'split':
      return 'split this floq';
    case 'ended':
      return 'ended the floq';
    case 'deleted':
      return 'deleted the floq';
    case 'boosted':
      return 'boosted this floq';
    case 'plan_created':
      return 'created a plan';
    case 'invited':
      return 'invited someone to join';
    default:
      return eventType;
  }
}

export interface ActivityDisplay {
  icon: React.ComponentType<any>;
  action: string;
  userName: string;
  content?: string;
  isVibeChange?: boolean;
  vibeValue?: string;
}

export function resolveActivityDisplay(event: MergedActivity): ActivityDisplay {
  if (event.source === 'plan_activity') {
    return {
      icon: planIcons[event.kind as keyof typeof planIcons] ?? MessageCircle,
      action: planActionText[event.kind as keyof typeof planActionText] ?? 'did something',
      userName: event.guest_name || 'Someone',
      content: event.content || undefined
    };
  } else {
    const isVibeChange = event.event_type === 'vibe_changed';
    return {
      icon: historyIcons[event.event_type as keyof typeof historyIcons] ?? Activity,
      action: getHistoryActionText(event.event_type, event.metadata),
      userName: event.user_profile?.display_name || event.user_profile?.username || 'Someone',
      isVibeChange,
      vibeValue: isVibeChange ? event.metadata?.new_vibe : undefined
    };
  }
}