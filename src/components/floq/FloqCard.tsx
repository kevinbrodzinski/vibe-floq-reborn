import React, { useCallback, CSSProperties } from 'react';
import { Users, MapPin, Clock } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDrag } from '@use-gesture/react';
import { cn } from '@/lib/utils';
import { formatDistance } from '@/utils/formatDistance';
import { formatTimeLeft } from '@/utils/formatTimeLeft';
import { getVibeColor } from '@/utils/getVibeColor';
import { getVibeIcon } from '@/utils/vibeIcons';
import { toast } from 'sonner';
import { ActionPill } from '@/components/ui/ActionPill';
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
  const vibeColor = getVibeColor(floq.primary_vibe);
  const vibeIcon = getVibeIcon(floq.primary_vibe);
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

  // Constants
  const SWIPE_THRESHOLD = 80;

  // Handle ignore floq
  const handleIgnore = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    ignoreFloq({ floqId: floq.id });
  }, [ignoreFloq, floq.id]);

  // Swipe gesture handling
  const bind = useDrag(
    ({ movement: [mx], down, cancel }) => {
      if (!down) return;
      
      // Left swipe (hide) - ignore this floq
      if (mx < -SWIPE_THRESHOLD && !floq.is_joined) {
        cancel();
        ignoreFloq({ floqId: floq.id });
      }
      
      // Left swipe (leave) - only if joined
      if (mx < -SWIPE_THRESHOLD && floq.is_joined && onLeave) {
        cancel();
        handleLeave();
      }
      
      // Right swipe (boost) - guard against already boosted
      if (mx > SWIPE_THRESHOLD && onBoost) {
        cancel();
        handleBoost();
      }
    },
    {
      axis: 'x',
      filterTaps: true,
      pointer: { touch: true, capture: true },
      // Only disable passive on iOS for smooth swipe experience
      ...(navigator.userAgent.includes('iPhone') && { passive: false })
    }
  );

  const handleCardClick = () => {
    navigate(`/floqs/${floq.id}`, { 
      state: { from: location.pathname } 
    });
  };

  const handleJoin = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (isFull) {
      toast.info("This floq is full");
      return;
    }
    // Join logic would go here
    toast.success("Joined floq!");
  }, [isFull]);

  const handleHide = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    ignoreFloq({ floqId: floq.id });
  }, [ignoreFloq, floq.id]);

  return (
    <article
      {...bind()}
      style={{ '--vibe': vibeColor } as CSSProperties}
      className={cn(
        'group rounded-3xl bg-white/5 backdrop-blur-md p-6',
        'ring-1 ring-white/10 hover:ring-white/25',
        'transition-all duration-300 hover:-translate-y-0.5',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vibe)]',
        'cursor-pointer active:scale-[.98] active:brightness-90'
      )}
      onClick={handleCardClick}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
      tabIndex={0}
      aria-label={`${floq.title} floq${floq.description ? `. ${floq.description}` : ''}. ${floq.participant_count} members, ${formatDistance(floq.distance_meters)} away`}
    >
      {/* Header with avatar and glow */}
      <div className="flex items-start gap-4 mb-4">
        {/* Avatar with neon ring */}
        <div className="relative shrink-0">
          <span
            aria-hidden="true"
            className="size-16 rounded-full flex items-center justify-center text-2xl text-white bg-black/40 relative z-10"
          >
            {vibeIcon}
          </span>
          <span
            className="absolute inset-0 rounded-full before:absolute before:inset-0 before:rounded-full before:bg-[var(--vibe)] before:blur-xl before:opacity-50"
            aria-hidden="true"
          />
        </div>

        {/* Text content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-xl font-semibold text-white drop-shadow-[0_0_4px_rgba(0,0,0,0.35)] mb-1">
            {floq.title}
          </h3>
          {floq.description && (
            <p className="text-sm text-white/70 line-clamp-2 mb-3">
              {floq.description}
            </p>
          )}

          {/* Meta row with vibe-tinted icons */}
          <div className="flex gap-4 text-sm text-white/80">
            <div className="flex items-center gap-1.5" title="Member count">
              <Users 
                className="h-4 w-4" 
                style={{ color: `color-mix(in srgb, ${vibeColor} 60%, white)` }}
              />
              <span>{floq.participant_count} / {floq.max_participants ?? '∞'}</span>
            </div>
            <div className="flex items-center gap-1.5" title="Distance">
              <MapPin 
                className="h-4 w-4" 
                style={{ color: `color-mix(in srgb, ${vibeColor} 60%, white)` }}
              />
              <span>{formatDistance(floq.distance_meters)}</span>
            </div>
            <div className="flex items-center gap-1.5" title="Time">
              <Clock 
                className="h-4 w-4" 
                style={{ color: `color-mix(in srgb, ${vibeColor} 60%, white)` }}
              />
              <span>{floq.ends_at ? `Ends in ${formatTimeLeft(floq.ends_at)}` : 'Ongoing'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <ActionPill 
          variant="primary" 
          label="View" 
          onClick={(e) => {
            e.stopPropagation();
            handleCardClick();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              handleCardClick();
            }
          }}
        />
        <ActionPill 
          variant="ghost" 
          label={floq.is_joined ? "Joined" : isFull ? "Full" : "Join"}
          onClick={handleJoin}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              handleJoin(e as any);
            }
          }}
          disabled={floq.is_joined || isFull}
        />
        <ActionPill 
          variant="ghost" 
          label="Hide" 
          onClick={handleHide}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              handleHide(e as any);
            }
          }}
        />
      </div>
    </article>
  );
});