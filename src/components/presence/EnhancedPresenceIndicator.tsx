import { useState, useEffect } from 'react';
import { cn } from '@/lib/utils';
import { useOptimizedPresenceQuery } from '@/hooks/useOptimizedQuery';
import { Badge } from '@/components/ui/badge';
import { Circle, MapPin, Clock } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface EnhancedPresenceIndicatorProps {
  profileId: string;
  size?: 'sm' | 'md' | 'lg';
  showVibe?: boolean;
  showLastSeen?: boolean;
  showLocation?: boolean;
  className?: string;
}

const VIBE_COLORS = {
  social: 'bg-blue-500',
  creative: 'bg-purple-500',
  focused: 'bg-green-500',
  adventurous: 'bg-orange-500',
  chill: 'bg-cyan-500',
  energetic: 'bg-red-500'
};

const VIBE_EMOJIS = {
  social: '🤝',
  creative: '🎨',
  focused: '🎯',
  adventurous: '🗺️',
  chill: '😌',
  energetic: '⚡'
};

export function EnhancedPresenceIndicator({
  profileId,
  size = 'md',
  showVibe = false,
  showLastSeen = false,
  showLocation = false,
  className
}: EnhancedPresenceIndicatorProps) {
  const { data: presence, isLoading } = useOptimizedPresenceQuery(profileId);
  const [isOnline, setIsOnline] = useState(false);

  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  // Determine if user is online (updated within last 5 minutes)
  useEffect(() => {
    if (presence?.updated_at) {
      const lastUpdate = new Date(presence.updated_at);
      const fiveMinutesAgo = new Date(Date.now() - 5 * 60 * 1000);
      setIsOnline(lastUpdate > fiveMinutesAgo);
    } else {
      setIsOnline(false);
    }
  }, [presence?.updated_at]);

  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-2', className)}>
        <div className={cn('rounded-full bg-muted animate-pulse', sizeClasses[size])} />
        {showVibe && <div className="w-12 h-4 bg-muted rounded animate-pulse" />}
      </div>
    );
  }

  const vibeColor = presence?.vibe ? VIBE_COLORS[presence.vibe as keyof typeof VIBE_COLORS] : 'bg-muted';
  const vibeEmoji = presence?.vibe ? VIBE_EMOJIS[presence.vibe as keyof typeof VIBE_EMOJIS] : '💭';

  return (
    <div className={cn('flex items-center gap-2', className)}>
      {/* Status indicator */}
      <div className="relative">
        <Circle
          className={cn(
            'rounded-full transition-all duration-300',
            sizeClasses[size],
            isOnline ? 'text-green-500 fill-current' : 'text-muted-foreground/50 fill-current',
            isOnline && 'animate-pulse'
          )}
        />
        
        {/* Vibe overlay for online users */}
        {isOnline && presence?.vibe && (
          <div 
            className={cn(
              'absolute -top-0.5 -right-0.5 rounded-full border border-background',
              size === 'sm' ? 'w-1.5 h-1.5' : size === 'md' ? 'w-2 h-2' : 'w-2.5 h-2.5',
              vibeColor
            )}
          />
        )}
      </div>

      {/* Vibe badge */}
      {showVibe && presence?.vibe && (
        <Badge variant="secondary" className="text-xs">
          <span className="mr-1">{vibeEmoji}</span>
          {presence.vibe}
        </Badge>
      )}

      {/* Last seen indicator */}
      {showLastSeen && presence?.updated_at && !isOnline && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="w-3 h-3" />
          {formatDistanceToNow(new Date(presence.updated_at), { addSuffix: true })}
        </div>
      )}

      {/* Location indicator */}
      {showLocation && presence?.visibility === 'public' && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="w-3 h-3" />
          <span>Live</span>
        </div>
      )}
    </div>
  );
}

// Compact version for lists
export function CompactPresenceIndicator({ profileId, className }: { profileId: string; className?: string }) {
  return (
    <EnhancedPresenceIndicator
      profileId={profileId}
      size="sm"
      className={className}
    />
  );
}

// Rich version for profiles
export function RichPresenceIndicator({ profileId, className }: { profileId: string; className?: string }) {
  return (
    <EnhancedPresenceIndicator
      profileId={profileId}
      size="md"
      showVibe
      showLastSeen
      showLocation
      className={className}
    />
  );
}