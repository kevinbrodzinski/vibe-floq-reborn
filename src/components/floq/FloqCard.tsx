import React, { useCallback, CSSProperties } from 'react';
import { Users, MapPin, Clock, Eye, XCircle, UserPlus, Crown, Zap, ChevronLeft, Waves, Circle } from 'lucide-react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useDrag } from '@use-gesture/react';
import { cn } from '@/lib/utils';
import { formatDistance } from '@/utils/formatDistance';
import { formatTimeLeft } from '@/utils/formatTimeLeft';
import { vibeColor, vibeGradient } from '@/utils/vibe';
import { getVibeColor } from '@/utils/getVibeColor';
import { VibeIcon } from '@/components/VibeIcon';
import { toast } from 'sonner';
import { ActionPill } from '@/components/ui/ActionPill';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
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
  
  // Time-based live status - check if floq has been live for >5 minutes
  const liveMinutes = endsAt && startsAt ? (now.getTime() - startsAt.getTime()) / (1000 * 60) : 0;
  const isWindingDown = liveMinutes > 5;

  // Detect user's motion preference
  const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  return (
    <article
      {...bind()}
      className={cn(
        'group relative overflow-hidden card-glass',
        'rounded-3xl p-6 cursor-pointer shadow-[0_4px_24px_rgba(0,0,0,.45)] ring-1 ring-white/10',
        'transition-all duration-300 ease-out',
        !prefersReducedMotion && 'hover:scale-[1.02] hover:-translate-y-1',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[color:var(--vibe-from)]',
        // Hover shimmer effect
        'before:absolute before:inset-0 before:bg-gradient-to-r before:from-transparent before:via-white/5 before:to-transparent',
        'before:translate-x-[-100%] before:transition-transform before:duration-1000',
        !prefersReducedMotion && 'hover:before:translate-x-[100%]'
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
        className={cn(
          "pointer-events-none absolute inset-0 opacity-25 transition",
          !prefersReducedMotion && "group-hover:opacity-40"
        )}
        style={{ background: vibeGradient(floq.primary_vibe) }}
        aria-hidden="true"
      />

      {/* Top-right vibe pill with icon */}
      <div 
        className="absolute top-3 right-3 px-2 py-0.5 text-[10px] uppercase tracking-wide rounded-full ring-1 backdrop-blur-sm font-medium flex items-center gap-1"
        style={{
          backgroundColor: `${getVibeColor(floq.primary_vibe)}20`,
          borderColor: `${getVibeColor(floq.primary_vibe)}40`,
          color: getVibeColor(floq.primary_vibe)
        }}
      >
        {floq.primary_vibe === 'flowing' && <Waves size={10} />}
        {floq.primary_vibe}
      </div>

      {/* Top-left status badges - removed NEW */}
      {isHot && (
        <div className="absolute top-3 left-3 flex flex-col gap-1">
          <div className="px-2 py-0.5 text-[10px] font-bold bg-orange-500/90 text-white rounded-full ring-1 ring-orange-400/50 uppercase tracking-wide">
            HOT
          </div>
        </div>
      )}

      {/* Bottom-right corner badges */}
      <div className="absolute bottom-3 right-3 flex flex-col gap-1 items-end">
        {isCreator && (
          <div className="px-2 py-0.5 text-[10px] font-bold bg-purple-500/90 text-white rounded-full uppercase tracking-wide">
            HOST
          </div>
        )}
      </div>

      {/* Row 1: Main avatar + title + status */}
      <div className="relative z-10 flex items-start gap-3">
        <div className="mt-[2px]">
          <VibeIcon vibe={floq.primary_vibe} size="lg" />
        </div>
        
        <div>
          <h3 className="text-lg font-semibold leading-tight text-white">
            {floq.title}
          </h3>
          <p className="mt-0.5 text-sm text-muted-foreground tracking-tight">
            {(() => {
              const now = new Date();
              const startsAt = floq.starts_at ? new Date(floq.starts_at) : null;
              const endsAt = floq.ends_at ? new Date(floq.ends_at) : null;
              
              if (startsAt && startsAt > now) {
                return <span className="text-zinc-400">{`Starts in ${floq.starts_in_min}m`}</span>;
              } else if (endsAt && now < endsAt) {
                return (
                  <span className="inline-flex items-center gap-1 text-emerald-400" style={{ textShadow: 'none' }}>
                    <Circle size={8} aria-hidden className="text-emerald-400" />
                    {isWindingDown ? "Winding down" : "Live now"}
                  </span>
                );
              } else if (endsAt && now >= endsAt) {
                return <span className="text-zinc-400">Ended</span>;
              } else {
                return <span className="text-zinc-400">Active</span>;
              }
            })()}
          </p>
        </div>
      </div>

      {/* Vibe match percentage */}
      <div className="relative z-10 mt-2 ml-[calc(theme(spacing.20)+theme(spacing.3))]">
        <span className="text-xs text-emerald-400 font-medium">
          87% vibe match
        </span>
      </div>

      {/* Row 2: Member avatar stack - aligned under title */}
      {floq.members && floq.members.length > 0 && (
        <div className="relative z-10 mt-3 ml-[calc(theme(spacing.20)+theme(spacing.3))] flex -space-x-2">
          {floq.members.slice(0, 3).map((member, index) => (
            <Avatar key={member.id} className="h-6 w-6 border-2 border-white/20" style={{ zIndex: 10 - index }}>
              <AvatarImage 
                src={member.avatar_url || '/placeholder.svg'} 
                alt={member.display_name}
                loading="lazy"
              />
              <AvatarFallback className="bg-white/10 text-white text-xs">
                {member.display_name?.[0]?.toUpperCase() || '?'}
              </AvatarFallback>
            </Avatar>
          ))}
          {floq.members.length > 3 && (
            <div className="flex h-6 w-6 items-center justify-center rounded-full border-2 border-white/20 bg-white/10 text-xs font-medium text-white">
              +{floq.members.length - 3}
            </div>
          )}
        </div>
      )}

      {/* Description */}
      {floq.description && (
        <p className="relative z-10 mt-3 text-sm text-zinc-300 line-clamp-2 text-shadow-subtle">
          {floq.description}
        </p>
      )}

      {/* Meta row with vibe-tinted frosted glass */}
      <div className="relative z-10 mt-4 flex flex-wrap gap-2">
        <span 
          className="flex items-center gap-1 px-2 py-1 rounded-full backdrop-blur-sm border border-white/10"
          style={{ 
            backgroundColor: isLive ? `hsl(var(--vibe-h), var(--vibe-s), var(--vibe-l), 0.3)` : `hsl(var(--vibe-h), var(--vibe-s), var(--vibe-l), 0.1)`,
            borderColor: `hsl(var(--vibe-h), var(--vibe-s), var(--vibe-l), 0.2)`
          }}
        >
          <Users
            size={14}
            strokeWidth={2}
            className="text-[color:var(--vibe-from)]"
          />
          <span className="text-xs text-white/90">
            {floq.participant_count}/{floq.max_participants ?? '∞'}
          </span>
        </span>

        <span 
          className="flex items-center gap-1 px-2 py-1 rounded-full backdrop-blur-sm border border-white/10"
          style={{ 
            backgroundColor: isLive ? `hsl(var(--vibe-h), var(--vibe-s), var(--vibe-l), 0.3)` : `hsl(var(--vibe-h), var(--vibe-s), var(--vibe-l), 0.1)`,
            borderColor: `hsl(var(--vibe-h), var(--vibe-s), var(--vibe-l), 0.2)`
          }}
        >
          <MapPin size={14} strokeWidth={2} className="text-[color:var(--vibe-from)]" />
          <span className="text-xs text-white/90">
            {formatDistance(floq.distance_meters)}
          </span>
        </span>

        <span 
          className="flex items-center gap-1 px-2 py-1 rounded-full backdrop-blur-sm border border-white/10"
          style={{ 
            backgroundColor: isLive ? `hsl(var(--vibe-h), var(--vibe-s), var(--vibe-l), 0.3)` : `hsl(var(--vibe-h), var(--vibe-s), var(--vibe-l), 0.1)`,
            borderColor: `hsl(var(--vibe-h), var(--vibe-s), var(--vibe-l), 0.2)`
          }}
        >
          <Clock size={14} strokeWidth={2} className="text-[color:var(--vibe-from)]" />
          <span className="text-xs text-white/90">
            {floq.ends_at ? `Ends in ${formatTimeLeft(floq.ends_at)}` : 'Ongoing'}
          </span>
        </span>
      </div>

      {/* Action row with conditional CTAs */}
      <div className="relative z-10 mt-6 flex flex-wrap gap-2">
        <ActionPill
          startIcon={<Eye size={12} />}
          variant="primary"
          size="xs"
          className="transition-transform duration-150 hover:scale-105 active:scale-95"
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
            startIcon={<Crown size={12} />}
            variant="ghost"
            size="xs"
            className="transition-transform duration-150 hover:scale-105 active:scale-95"
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/floqs/${floq.id}/manage`);
            }}
          >
            Manage
          </ActionPill>
        ) : (
          <ActionPill
            startIcon={<UserPlus size={12} />}
            variant={floq.is_joined ? 'ghost' : 'success'}
            size="xs"
            disabled={floq.is_joined}
            className="transition-transform duration-150 hover:scale-105 active:scale-95"
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
      </div>

      {/* Swipe hint for non-joined floqs on touch devices */}
      {!floq.is_joined && (
        <div className="relative z-10 mt-2 flex items-center gap-1 text-xs text-muted-foreground md:hidden">
          <ChevronLeft size={12} aria-hidden />
          <span>Swipe left to hide</span>
        </div>
      )}
    </article>
  );
});