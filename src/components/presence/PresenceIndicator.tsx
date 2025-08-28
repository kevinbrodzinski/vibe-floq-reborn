import React from 'react';
import { motion } from 'framer-motion';
import { Circle, MapPin, Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { formatDistanceToNow } from 'date-fns';

interface PresenceIndicatorProps {
  online?: boolean;
  vibe?: string | null;
  lastSeen?: string | null;
  size?: 'sm' | 'md' | 'lg';
  showVibe?: boolean;
  showLastSeen?: boolean;
}

const vibeColors: Record<string, string> = {
  social: 'bg-blue-500',
  creative: 'bg-purple-500',
  focused: 'bg-green-500',
  relaxed: 'bg-yellow-500',
  energetic: 'bg-red-500',
  curious: 'bg-orange-500',
  excited: 'bg-pink-500',
};

const vibeEmojis: Record<string, string> = {
  social: '🤝',
  creative: '🎨',
  focused: '🎯',
  relaxed: '😌',
  energetic: '⚡',
  curious: '🤔',
  excited: '🎉',
};

export function PresenceIndicator({
  online = false,
  vibe,
  lastSeen,
  size = 'md',
  showVibe = true,
  showLastSeen = true
}: PresenceIndicatorProps) {
  const sizeClasses = {
    sm: 'w-2 h-2',
    md: 'w-3 h-3',
    lg: 'w-4 h-4'
  };

  const getVibeColor = (vibeTag: string) => {
    return vibeColors[vibeTag.toLowerCase()] || 'bg-gray-500';
  };

  const getVibeEmoji = (vibeTag: string) => {
    return vibeEmojis[vibeTag.toLowerCase()] || '💭';
  };

  const formatLastSeen = (timestamp: string) => {
    try {
      return formatDistanceToNow(new Date(timestamp), { addSuffix: true });
    } catch {
      return 'recently';
    }
  };

  if (online) {
    return (
      <div className="flex items-center gap-1">
        <Tooltip>
          <TooltipTrigger asChild>
            <div className="relative">
              <motion.div
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className={`${sizeClasses[size]} bg-green-500 rounded-full`}
              />
              <motion.div
                animate={{ scale: [1, 1.5, 1], opacity: [1, 0, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
                className={`absolute inset-0 ${sizeClasses[size]} bg-green-500 rounded-full`}
              />
            </div>
          </TooltipTrigger>
          <TooltipContent>
            <div className="text-center">
              <p className="font-medium">Online now</p>
              {vibe && showVibe && (
                <p className="text-sm flex items-center gap-1">
                  <span>{getVibeEmoji(vibe)}</span>
                  <span className="capitalize">{vibe}</span>
                </p>
              )}
            </div>
          </TooltipContent>
        </Tooltip>

        {vibe && showVibe && (
          <Badge 
            variant="secondary" 
            className="text-xs px-1.5 py-0.5 gap-1"
          >
            <span>{getVibeEmoji(vibe)}</span>
            <span className="capitalize">{vibe}</span>
          </Badge>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Tooltip>
        <TooltipTrigger asChild>
          <div className={`${sizeClasses[size]} bg-gray-400 rounded-full opacity-60`} />
        </TooltipTrigger>
        <TooltipContent>
          <div className="text-center">
            <p className="font-medium">Offline</p>
            {lastSeen && showLastSeen && (
              <p className="text-sm flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>Last seen {formatLastSeen(lastSeen)}</span>
              </p>
            )}
          </div>
        </TooltipContent>
      </Tooltip>

      {lastSeen && showLastSeen && (
        <span className="text-xs text-muted-foreground">
          {formatLastSeen(lastSeen)}
        </span>
      )}
    </div>
  );
}

export function LivePresenceIndicator({ 
  profileId,
  size = 'md',
  showDetails = true 
}: { 
  profileId: string;
  size?: 'sm' | 'md' | 'lg';
  showDetails?: boolean;
}) {
  // In a real implementation, you'd fetch presence data for this profileId
  // For now, we'll use mock data or props
  
  return (
    <PresenceIndicator
      online={false} // TODO: Connect to real presence data
      vibe={null}
      lastSeen={null}
      size={size}
      showVibe={showDetails}
      showLastSeen={showDetails}
    />
  );
}