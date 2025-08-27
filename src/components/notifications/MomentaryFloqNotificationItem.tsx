import React from 'react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Waves, Users, Zap, MapPin, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface MomentaryFloqNotificationItemProps {
  notification: {
    id: string;
    kind: string;
    payload: any;
    created_at: string;
    seen_at?: string;
  };
  onTap: () => void;
  onMarkSeen?: () => void;
}

export const MomentaryFloqNotificationItem: React.FC<MomentaryFloqNotificationItemProps> = ({
  notification,
  onTap,
  onMarkSeen
}) => {
  const { kind, payload, created_at, seen_at } = notification;
  const isUnseen = !seen_at;

  const getIcon = () => {
    switch (kind) {
      case 'friend_started_floq_nearby':
        return <Waves className="w-5 h-5 text-purple-500" />;
      case 'momentary_floq_friend_joined':
        return <Users className="w-5 h-5 text-green-500" />;
      case 'wave_activity_friend':
        return <Zap className="w-5 h-5 text-yellow-500" />;
      case 'momentary_floq_nearby':
        return <MapPin className="w-5 h-5 text-blue-500" />;
      default:
        return <Waves className="w-5 h-5 text-gray-500" />;
    }
  };

  const getTitle = () => {
    switch (kind) {
      case 'friend_started_floq_nearby':
        return `${payload.friend_name} started a floq`;
      case 'momentary_floq_friend_joined':
        return `${payload.friend_name} joined your floq`;
      case 'wave_activity_friend':
        return 'Friends are gathering nearby';
      case 'momentary_floq_nearby':
        return 'Floq happening nearby';
      default:
        return 'Momentary floq activity';
    }
  };

  const getDescription = () => {
    switch (kind) {
      case 'friend_started_floq_nearby':
        return payload.venue_name 
          ? `"${payload.floq_title}" at ${payload.venue_name}`
          : `"${payload.floq_title}"`;
      case 'momentary_floq_friend_joined':
        return `"${payload.floq_title}"`;
      case 'wave_activity_friend':
        return payload.venue_name
          ? `Wave activity at ${payload.venue_name}`
          : 'Wave activity in your area';
      case 'momentary_floq_nearby':
        return payload.venue_name
          ? `"${payload.floq_title}" at ${payload.venue_name}`
          : `"${payload.floq_title}" • ${payload.distance_m}m away`;
      default:
        return 'Tap to see details';
    }
  };

  const getCTA = () => {
    switch (kind) {
      case 'friend_started_floq_nearby':
        return 'Join';
      case 'momentary_floq_friend_joined':
        return 'View';
      case 'wave_activity_friend':
        return 'Discover';
      case 'momentary_floq_nearby':
        return 'Join';
      default:
        return 'View';
    }
  };

  return (
    <div
      className={cn(
        "flex items-start gap-3 p-4 border-b border-border/50 cursor-pointer hover:bg-muted/50 transition-colors",
        isUnseen && "bg-primary/5 border-l-4 border-l-primary"
      )}
      onClick={onTap}
    >
      {/* Icon */}
      <div className="flex-shrink-0 mt-1">
        {getIcon()}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0 space-y-1">
        <div className="flex items-start justify-between gap-2">
          <h4 className={cn(
            "font-medium text-sm",
            isUnseen ? "text-foreground" : "text-muted-foreground"
          )}>
            {getTitle()}
          </h4>
          <span className="text-xs text-muted-foreground flex-shrink-0">
            {formatDistanceToNow(new Date(created_at), { addSuffix: true })}
          </span>
        </div>
        
        <p className="text-sm text-muted-foreground">
          {getDescription()}
        </p>

        {/* Distance badge for location-based notifications */}
        {(payload.distance_m || payload.lat) && (
          <div className="flex items-center gap-2 mt-2">
            <Badge variant="secondary" className="text-xs">
              {payload.distance_m ? `${payload.distance_m}m away` : 'Nearby'}
            </Badge>
          </div>
        )}
      </div>

      {/* Action button */}
      <div className="flex-shrink-0">
        <Button size="sm" variant={isUnseen ? "default" : "outline"}>
          {getCTA()}
        </Button>
      </div>
    </div>
  );
};