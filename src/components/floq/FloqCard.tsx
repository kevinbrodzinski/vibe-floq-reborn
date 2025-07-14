import React, { useCallback, CSSProperties } from 'react';
import { Users, MapPin, Clock, Eye, XCircle, UserPlus } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDrag } from '@use-gesture/react';
import { cn } from '@/lib/utils';
import { formatDistance } from '@/utils/formatDistance';
import { formatTimeLeft } from '@/utils/formatTimeLeft';
import { vibeColor, vibeGradient } from '@/utils/vibe';
import { VibeIcon } from '@/components/VibeIcon';
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
  const accent = vibeColor(floq.primary_vibe);
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
      className={cn(
        'group relative overflow-hidden card-glass',
        'rounded-3xl p-6 cursor-pointer shadow-[0_4px_24px_rgba(0,0,0,.45)] ring-1 ring-white/10',
        'transition-all duration-300 ease-out',
        'hover:scale-[1.02] hover:-translate-y-1',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--vibe-from)]'
      )}
      style={{ '--vibe-from': accent } as React.CSSProperties}
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
      {/* Radial glow */}
      <div
        className="pointer-events-none absolute inset-0 opacity-25 transition group-hover:opacity-40"
        style={{ background: vibeGradient(floq.primary_vibe) }}
        aria-hidden="true"
      />

      {/* Row 1: avatar + title */}
      <div className="relative z-10 flex items-center gap-4">
        <VibeIcon vibe={floq.primary_vibe} size="md" />
        
        <div>
          <h3 className="text-lg font-semibold leading-tight text-white drop-shadow-sm">
            {floq.title}
          </h3>
          <p className="mt-0.5 text-sm text-zinc-400">
            {floq.primary_vibe} &bull;{' '}
            {floq.starts_at
              ? `Starts in ${formatDistance(floq.starts_in_min * 60)}`
              : 'Active'}
          </p>
        </div>
      </div>

      {/* Description */}
      {floq.description && (
        <p className="relative z-10 mt-3 text-sm text-zinc-300 line-clamp-2">
          {floq.description}
        </p>
      )}

      {/* Meta row */}
      <div className="relative z-10 mt-4 flex flex-wrap gap-2">
        <span className="flex items-center gap-1 px-3 py-1 rounded-full backdrop-blur-sm bg-white/5 border border-white/10">
          <Users
            size={14}
            strokeWidth={2}
            className="text-[color:var(--vibe-from)]"
          />
          <span className="text-xs text-white/90">
            {floq.participant_count}/{floq.max_participants ?? '∞'}
          </span>
        </span>

        <span className="flex items-center gap-1 px-3 py-1 rounded-full backdrop-blur-sm bg-white/5 border border-white/10">
          <MapPin size={14} strokeWidth={2} className="text-[color:var(--vibe-from)]" />
          <span className="text-xs text-white/90">
            {formatDistance(floq.distance_meters)}
          </span>
        </span>

        <span className="flex items-center gap-1 px-3 py-1 rounded-full backdrop-blur-sm bg-white/5 border border-white/10">
          <Clock size={14} strokeWidth={2} className="text-[color:var(--vibe-from)]" />
          <span className="text-xs text-white/90">
            {floq.ends_at ? `Ends in ${formatTimeLeft(floq.ends_at)}` : 'Ongoing'}
          </span>
        </span>
      </div>

      {/* Action row */}
      <div className="relative z-10 mt-6 flex flex-wrap gap-3">
        <ActionPill
          startIcon={<Eye size={14} />}
          variant="primary"
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
        >
          View
        </ActionPill>
        
        <ActionPill
          startIcon={<UserPlus size={14} />}
          variant={floq.is_joined ? 'ghost' : 'success'}
          disabled={floq.is_joined}
          onClick={handleJoin}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              handleJoin(e as any);
            }
          }}
        >
          {floq.is_joined
            ? 'Joined'
            : floq.participant_count >= (floq.max_participants ?? 1e6)
            ? 'Full'
            : 'Join'}
        </ActionPill>
        
        <ActionPill
          startIcon={<XCircle size={14} />}
          variant="ghost"
          onClick={handleHide}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              handleHide(e as any);
            }
          }}
        >
          Hide
        </ActionPill>
      </div>
    </article>
  );
});