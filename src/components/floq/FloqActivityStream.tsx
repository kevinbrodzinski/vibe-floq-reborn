import React from 'react';
import { useFloqActivity } from '@/hooks/useFloqActivity';
import { formatDistanceToNow } from 'date-fns';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
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
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

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

const getHistoryActionText = (eventType: string, metadata?: any) => {
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
};

interface FloqActivityStreamProps {
  floqId: string;
}

export const FloqActivityStream: React.FC<FloqActivityStreamProps> = ({ floqId }) => {
  const { activity, isLoading } = useFloqActivity(floqId);

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-4 w-1/2 bg-muted rounded" />
          <div className="h-16 bg-muted rounded" />
        </div>
      </Card>
    );
  }

  if (!activity.length) {
    return (
      <Card className="p-6">
        <div className="text-center py-8">
          <MessageCircle className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
          <h4 className="font-medium mb-2">No activity yet</h4>
          <p className="text-sm text-muted-foreground">
            Activity will appear here when members create or update plans.
          </p>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {activity.map((entry: any) => {
        const isPlanEvent = entry.source === 'plan_activity';
        
        let Icon, actionText, userName, content;
        
        if (isPlanEvent) {
          Icon = planIcons[entry.kind as keyof typeof planIcons] ?? MessageCircle;
          actionText = planActionText[entry.kind as keyof typeof planActionText];
          userName = entry.guest_name || 'Someone';
          content = entry.content;
        } else {
          Icon = historyIcons[entry.event_type as keyof typeof historyIcons] ?? Activity;
          actionText = getHistoryActionText(entry.event_type, entry.metadata);
          userName = entry.user_profile?.display_name || entry.user_profile?.username || 'Someone';
          content = null;
        }
        
        return (
          <Card key={entry.id} className="p-4">
            <div className="flex items-start gap-3">
              <Avatar className="h-8 w-8">
                <AvatarImage src={entry.user_profile?.avatar_url || undefined} />
                <AvatarFallback className="text-xs">
                  {userName?.charAt(0)?.toUpperCase() || '?'}
                </AvatarFallback>
              </Avatar>
              
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 text-sm">
                  <Icon className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                  <span className="font-medium">
                    {userName}
                  </span>
                  <span className="text-muted-foreground">
                    {actionText}
                  </span>
                </div>
                
                {content && (
                  <div className="mt-1 text-sm text-foreground">
                    "{content}"
                  </div>
                )}
                
                {/* Show vibe badge for vibe changes */}
                {!isPlanEvent && entry.event_type === 'vibe_changed' && entry.metadata?.new_vibe && (
                  <Badge variant="outline" className="text-xs capitalize mt-1">
                    {entry.metadata.new_vibe}
                  </Badge>
                )}
                
                <div className="mt-1 text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(entry.created_at), { addSuffix: true })}
                </div>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
};