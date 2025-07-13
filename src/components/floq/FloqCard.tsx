import React from 'react';
import { Users, MapPin, Clock } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDrag } from '@use-gesture/react';
import { cn } from '@/lib/utils';
import { formatDistance } from '@/utils/formatDistance';
import { formatStartedAgo } from '@/utils/formatTime';
import { vibeToBorder, getInitials } from '@/utils/vibeColors';
import type { NearbyFloq } from '@/hooks/useNearbyFlocks';

interface FloqCardProps {
  floq: NearbyFloq;
  onBoost?: (floqId: string) => void;
  onLeave?: (floqId: string) => void;
}

export const FloqCard: React.FC<FloqCardProps> = ({ 
  floq, 
  onBoost, 
  onLeave 
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const vibeColor = vibeToBorder(floq.primary_vibe);

  // Swipe gesture handling
  const bind = useDrag(
    ({ movement: [mx], down, cancel }) => {
      if (!down) return;
      
      // Left swipe (leave) - only if joined
      if (mx < -80 && floq.is_joined && onLeave) {
        cancel();
        onLeave(floq.id);
      }
      
      // Right swipe (boost)
      if (mx > 80 && onBoost) {
        cancel();
        onBoost(floq.id);
      }
    },
    {
      axis: 'x',
      filterTaps: true,
      pointer: { touch: true }
    }
  );

  const handleCardClick = () => {
    navigate(`/floqs/${floq.id}`, { 
      state: { from: location.pathname } 
    });
  };

  const statusText = floq.is_joined 
    ? 'Joined' 
    : floq.participant_count >= (floq.max_participants || 50)
    ? 'Full' 
    : 'Join';

  const statusClassName = floq.is_joined
    ? 'bg-primary/20 text-primary'
    : floq.participant_count >= (floq.max_participants || 50)
    ? 'bg-muted text-muted-foreground'
    : 'bg-primary text-primary-foreground hover:brightness-110';

  return (
    <button
      {...bind()}
      onClick={handleCardClick}
      role="button"
      aria-pressed={floq.is_joined}
      aria-label={`${floq.title} floq, ${floq.participant_count} members, ${formatDistance(floq.distance_meters)} away`}
      className={cn(
        'w-full px-5 py-4 flex items-center gap-4 rounded-xl',
        'bg-card/30 border border-border/20 backdrop-blur-md',
        'hover:bg-card/50 transition-all duration-200',
        'active:scale-[.98] active:brightness-95',
        'text-left'
      )}
    >
      {/* Avatar with vibe ring */}
      <div
        className={cn(
          'shrink-0 h-12 w-12 rounded-full flex items-center justify-center',
          'text-base font-semibold text-primary-foreground bg-muted',
          'border-2',
          vibeColor
        )}
        title={`${floq.primary_vibe} vibe`}
      >
        {getInitials(floq.title)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <h3 className="text-sm font-semibold truncate text-foreground">
          {floq.title}
        </h3>
        
        {/* Meta row */}
        <div className="mt-1 flex flex-wrap text-xs text-muted-foreground gap-x-3">
          <span className="inline-flex items-center gap-1" title="Member count">
            <Users className="h-3 w-3" />
            {floq.participant_count}/{floq.max_participants || '∞'}
          </span>
          
          <span className="inline-flex items-center gap-1" title="Distance">
            <MapPin className="h-3 w-3" />
            {formatDistance(floq.distance_meters)}
          </span>
          
          <span className="inline-flex items-center gap-1" title="Started time">
            <Clock className="h-3 w-3" />
            {formatStartedAgo(floq.starts_at)}
          </span>
        </div>
      </div>

      {/* Status pill */}
      <span
        className={cn(
          'px-3 py-1 rounded-full text-xs font-medium transition-all',
          statusClassName
        )}
        title={`Floq status: ${statusText}`}
      >
        {statusText}
      </span>
    </button>
  );
};