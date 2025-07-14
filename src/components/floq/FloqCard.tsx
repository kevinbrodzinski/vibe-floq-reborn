import React, { useCallback, CSSProperties } from 'react';
import { Users, MapPin, Clock, Eye, XCircle, UserPlus, Crown, Zap } from 'lucide-react';
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
import { useAuth } from '@/providers/AuthProvider';
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
  const { user } = useAuth();
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

  // Status calculations for corner badges
  const now = new Date();
  const startsAt = floq.starts_at ? new Date(floq.starts_at) : null;
  const endsAt = floq.ends_at ? new Date(floq.ends_at) : null;
  const isLive = startsAt ? startsAt <= now : true;
  const isNew = floq.starts_at && (now.getTime() - new Date(floq.starts_at).getTime()) < 5 * 60 * 1000; // 5 minutes
  const isHot = (floq.boost_count || 0) >= 5;
  const isCreator = user?.id === floq.creator_id;

  return (
    <article
      {...bind()}
      className={cn(
        'group relative overflow-hidden card-glass',
        'rounded-3xl p-6 cursor-pointer shadow-[0_4px_24px_rgba(0,0,0,.45)] ring-1 ring-white/10',
        'transition-all duration-300 ease-out',
        'hover:scale-[1.02] hover:-translate-y-1',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--vibe-from)]',
        // Hover shimmer effect
        'before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/5 before:to-transparent',
        'before:translate-x-[-100%] before:transition-transform before:duration-1000',
        'hover:before:translate-x-[100%]'
      )}
      style={{ 
        '--vibe-from': accent,
        '--vibe-h': `var(--${floq.primary_vibe}-h)`,
        '--vibe-s': `var(--${floq.primary_vibe}-s)`, 
        '--vibe-l': `var(--${floq.primary_vibe}-l)`
      } as React.CSSProperties}
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

      {/* Corner badges */}
      {isLive && !startsAt && (
        <div className="absolute top-3 left-3 px-2 py-1 bg-primary/90 backdrop-blur-sm border border-white/20 rounded-full">
          <span className="text-xs font-medium text-white">LIVE</span>
        </div>
      )}
      
      {isCreator && (
        <div className="absolute top-3 right-3 px-2 py-1 bg-violet-500/90 backdrop-blur-sm border border-white/20 rounded-full flex items-center gap-1">
          <Crown size={12} strokeWidth={2} className="text-white" />
          <span className="text-xs font-medium text-white">Host</span>
        </div>
      )}
      
      {isNew && (
        <div className="absolute top-3 left-3 px-2 py-1 bg-emerald-500/90 backdrop-blur-sm border border-white/20 rounded-full">
          <span className="text-xs font-medium text-white">NEW</span>
        </div>
      )}
      
      {isHot && (
        <div className="absolute top-12 right-3 px-2 py-1 bg-orange-500/90 backdrop-blur-sm border border-white/20 rounded-full flex items-center gap-1">
          <Zap size={12} strokeWidth={2} className="text-white" />
          <span className="text-xs font-medium text-white">Hot</span>
        </div>
      )}

      {/* Row 1: avatar stack + title */}
      <div className="relative z-10 flex items-center gap-4">
        {/* Avatar stack */}
        <div className="relative flex items-center">
          <VibeIcon vibe={floq.primary_vibe} size="md" />
          {floq.members && floq.members.length > 0 && (
            <div className="ml-2 flex -space-x-2">
              {floq.members.slice(0, 3).map((member, index) => (
                <img
                  key={member.id}
                  src={member.avatar_url || '/placeholder.svg'}
                  alt={member.display_name}
                  loading="lazy"
                  className="h-6 w-6 rounded-full border-2 border-white/20 bg-white/10"
                  style={{ zIndex: 10 - index }}
                />
              ))}
              {floq.members.length > 3 && (
                <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white/20 bg-white/10 text-xs font-medium text-white">
                  +{floq.members.length - 3}
                </div>
              )}
            </div>
          )}
        </div>
        
        <div>
          <h3 className="text-lg font-semibold leading-tight text-white drop-shadow-sm text-shadow-subtle">
            {floq.title}
          </h3>
          <p className="mt-0.5 text-sm text-zinc-400 text-shadow-subtle">
            {floq.primary_vibe} &bull;{' '}
            {(() => {
              const now = new Date();
              const startsAt = floq.starts_at ? new Date(floq.starts_at) : null;
              const endsAt = floq.ends_at ? new Date(floq.ends_at) : null;
              
              if (startsAt && startsAt > now) {
                return `Starts in ${floq.starts_in_min}m`;
              } else if (endsAt && now < endsAt) {
                return 'Live now';
              } else if (endsAt && now >= endsAt) {
                return 'Ended';
              } else {
                return 'Active';
              }
            })()}
          </p>
        </div>
      </div>

      {/* Description */}
      {floq.description && (
        <p className="relative z-10 mt-3 text-sm text-zinc-300 line-clamp-2 text-shadow-subtle">
          {floq.description}
        </p>
      )}

      {/* Meta row with vibe-tinted frosted glass */}
      <div className="relative z-10 mt-4 flex flex-wrap gap-2">
        <span 
          className="flex items-center gap-1 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10"
          style={{ 
            backgroundColor: `hsl(var(--vibe-h), var(--vibe-s), var(--vibe-l), 0.1)`,
            borderColor: `hsl(var(--vibe-h), var(--vibe-s), var(--vibe-l), 0.2)`
          }}
        >
          <Users
            size={14}
            strokeWidth={2}
            className="text-[color:var(--vibe-from)]"
          />
          <span className="text-xs text-white/90 text-shadow-subtle">
            {floq.participant_count}/{floq.max_participants ?? '∞'}
          </span>
        </span>

        <span 
          className="flex items-center gap-1 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10"
          style={{ 
            backgroundColor: `hsl(var(--vibe-h), var(--vibe-s), var(--vibe-l), 0.1)`,
            borderColor: `hsl(var(--vibe-h), var(--vibe-s), var(--vibe-l), 0.2)`
          }}
        >
          <MapPin size={14} strokeWidth={2} className="text-[color:var(--vibe-from)]" />
          <span className="text-xs text-white/90 text-shadow-subtle">
            {formatDistance(floq.distance_meters)}
          </span>
        </span>

        <span 
          className="flex items-center gap-1 px-3 py-1 rounded-full backdrop-blur-sm border border-white/10"
          style={{ 
            backgroundColor: `hsl(var(--vibe-h), var(--vibe-s), var(--vibe-l), 0.1)`,
            borderColor: `hsl(var(--vibe-h), var(--vibe-s), var(--vibe-l), 0.2)`
          }}
        >
          <Clock size={14} strokeWidth={2} className="text-[color:var(--vibe-from)]" />
          <span className="text-xs text-white/90 text-shadow-subtle">
            {floq.ends_at ? `Ends in ${formatTimeLeft(floq.ends_at)}` : 'Ongoing'}
          </span>
        </span>
      </div>

      {/* Action row with conditional CTAs */}
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
        
        {isCreator ? (
          <ActionPill
            startIcon={<Crown size={14} />}
            variant="ghost"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/floqs/${floq.id}/manage`);
            }}
          >
            Manage
          </ActionPill>
        ) : (
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
        )}
        
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