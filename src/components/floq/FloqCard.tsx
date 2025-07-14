import React, { useCallback } from 'react';
import { Users, MapPin, Clock, MoreHorizontal } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDrag } from '@use-gesture/react';
import { cn } from '@/lib/utils';
import { formatDistance } from '@/utils/formatDistance';
import { formatStartedAgo } from '@/utils/formatTime';
import { formatTimeLeft } from '@/utils/formatTimeLeft';
import { vibeToBorder, getInitials } from '@/utils/vibeColors';
import { toast } from 'sonner';
import { VibePill } from './VibePill';
import { useIgnoreFloq } from '@/hooks/useIgnoreFloq';
import type { NearbyFloq } from '@/hooks/useNearbyFlocks';

interface FloqCardProps {
  floq: NearbyFloq;
  onBoost?: (floqId: string) => void;
  onLeave?: (floqId: string) => void;
  hasUserBoosted?: boolean;
}

export const FloqCard = React.memo<FloqCardProps>(({ 
  floq, 
  onBoost, 
  onLeave,
  hasUserBoosted = false
}) => {
  const navigate = useNavigate();
  const location = useLocation();
  const vibeColor = vibeToBorder(floq.primary_vibe);
  const isFull = floq.max_participants ? floq.participant_count >= floq.max_participants : false;
  const { mutate: ignoreFloq } = useIgnoreFloq();

  // Memoized handlers to prevent re-renders
  const handleBoost = useCallback(() => {
    if (hasUserBoosted) {
      toast.info("Already boosted this floq!");
      return;
    }
    onBoost?.(floq.id);
  }, [hasUserBoosted, onBoost, floq.id]);

  const handleLeave = useCallback(() => {
    onLeave?.(floq.id);
  }, [onLeave, floq.id]);

  // Handle ignore floq
  const handleIgnore = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    ignoreFloq({ floqId: floq.id });
    toast.success("Floq hidden from your feed");
  }, [ignoreFloq, floq.id]);

  // Swipe gesture handling
  const bind = useDrag(
    ({ movement: [mx], down, cancel }) => {
      if (!down) return;
      
      // Left swipe (hide) - ignore this floq
      if (mx < -80 && !floq.is_joined) {
        cancel();
        ignoreFloq({ floqId: floq.id });
        toast.success("Floq hidden from your feed");
      }
      
      // Left swipe (leave) - only if joined
      if (mx < -80 && floq.is_joined && onLeave) {
        cancel();
        handleLeave();
      }
      
      // Right swipe (boost) - guard against already boosted
      if (mx > 80 && onBoost) {
        cancel();
        handleBoost();
      }
    },
    {
      axis: 'x',
      filterTaps: true,
      pointer: { touch: true },
      passive: false // For smooth iOS swipe experience
    }
  );

  const handleCardClick = () => {
    navigate(`/floqs/${floq.id}`, { 
      state: { from: location.pathname } 
    });
  };

  const statusText = floq.is_joined 
    ? 'Joined' 
    : isFull
    ? 'Full' 
    : 'Join';

  const pillBase = 'rounded-full px-3 py-1 text-xs font-medium';
  const statusClass = floq.is_joined
    ? `${pillBase} bg-primary/20 text-primary`
    : isFull
    ? `${pillBase} bg-muted text-muted-foreground`
    : `${pillBase} bg-primary text-primary-foreground hover:brightness-110`;

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
        'text-left focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none',
        'cursor-grab active:cursor-grabbing',
        '[-webkit-tap-highlight-color:rgba(0,0,0,0)]'
      )}
    >
      {/* Avatar with vibe ring */}
      <div
        aria-hidden="true"
        className={cn(
          'shrink-0 h-12 w-12 rounded-full flex items-center justify-center',
          'text-base font-semibold text-primary-foreground bg-muted',
          'border-2 shadow-sm',
          vibeColor
        )}
      >
        {getInitials(floq.title)}
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        {/* Header with title and vibe */}
        <div className="flex items-center gap-2 mb-1">
          <h3 className="text-sm font-semibold truncate text-foreground mix-blend-darken dark:mix-blend-normal">
            {floq.title}
          </h3>
          <VibePill vibe={floq.primary_vibe} className="shrink-0" />
        </div>
        
        {/* Description */}
        {floq.description && (
          <p className="text-xs text-muted-foreground line-clamp-1 mb-1 mix-blend-darken dark:mix-blend-normal">
            {floq.description}
          </p>
        )}
        
        {/* Meta row */}
        <div className="flex flex-wrap text-xs text-muted-foreground gap-x-3 mix-blend-darken dark:mix-blend-normal">
          <span className="inline-flex items-center gap-1" title="Member count">
            <Users className="h-3 w-3" />
            {floq.participant_count}/{floq.max_participants || '∞'}
          </span>
          
          <span className="inline-flex items-center gap-1" title="Distance">
            <MapPin className="h-3 w-3" />
            {formatDistance(floq.distance_meters)}
          </span>
          
          <span className="inline-flex items-center gap-1" title="Ends/ongoing">
            <Clock className="h-3 w-3" />
            {floq.ends_at ? `Ends in ${formatTimeLeft(floq.ends_at)}` : 'Ongoing'}
          </span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {/* Status pill */}
        <span
          className={cn(
            'transition-all',
            statusClass
          )}
          title={`Floq status: ${statusText}`}
        >
          {statusText}
        </span>
        
        {/* Desktop menu for hide action */}
        <button
          onClick={handleIgnore}
          className="shrink-0 p-1 rounded-full hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
          title="Hide this floq"
          aria-label="Hide this floq"
        >
          <MoreHorizontal className="h-4 w-4" />
        </button>
      </div>
    </button>
  );
});