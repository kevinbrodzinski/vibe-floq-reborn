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
      style={{ 
        '--vibe-color': vibeColor,
        '--vibe-glow': `0 0 30px ${vibeColor}30`,
        '--vibe-gradient': `linear-gradient(135deg, ${vibeColor}15, ${vibeColor}05)`
      } as CSSProperties}
      className={cn(
        'group relative overflow-hidden',
        'rounded-3xl p-6 cursor-pointer',
        // Background with sophisticated gradient
        'bg-gradient-to-br from-white/[0.08] via-white/[0.04] to-transparent',
        'backdrop-blur-xl border border-white/10',
        // Vibe-specific gradient overlay
        'before:absolute before:inset-0 before:rounded-3xl',
        'before:bg-[var(--vibe-gradient)] before:opacity-60',
        // Interactive states
        'transition-all duration-500 ease-out',
        'hover:scale-[1.02] hover:border-white/20',
        'hover:shadow-[0_8px_32px_rgba(0,0,0,0.3),var(--vibe-glow)]',
        'hover:-translate-y-1',
        'active:scale-[0.98] active:duration-150',
        // Focus state
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--vibe-color)]',
        'focus-visible:ring-offset-2 focus-visible:ring-offset-background'
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
      {/* Header with large vibe icon and content */}
      <div className="relative z-10 flex items-start gap-6 mb-6">
        {/* Large vibe icon with sophisticated glow */}
        <div className="relative shrink-0">
          {/* Main icon */}
          <div
            className="size-20 rounded-full flex items-center justify-center text-3xl relative z-20"
            style={{
              background: `linear-gradient(135deg, ${vibeColor}40, ${vibeColor}20)`,
              color: vibeColor,
              border: `2px solid ${vibeColor}50`
            }}
          >
            {vibeIcon}
          </div>
          
          {/* Animated glow rings */}
          <div 
            className="absolute inset-0 rounded-full animate-pulse"
            style={{
              background: `radial-gradient(circle, ${vibeColor}30, transparent 60%)`,
              filter: 'blur(8px)',
              transform: 'scale(1.2)'
            }}
            aria-hidden="true"
          />
          <div 
            className="absolute inset-0 rounded-full"
            style={{
              background: `radial-gradient(circle, ${vibeColor}15, transparent 40%)`,
              filter: 'blur(16px)',
              transform: 'scale(1.6)',
              animation: 'pulse 3s ease-in-out infinite'
            }}
            aria-hidden="true"
          />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          {/* Title with enhanced typography */}
          <h3 className="text-2xl font-bold text-white mb-2 tracking-tight">
            <span className="drop-shadow-[0_0_8px_rgba(0,0,0,0.5)]">
              {floq.title}
            </span>
          </h3>
          
          {/* Description with better styling */}
          {floq.description && (
            <p className="text-sm text-white/75 line-clamp-2 mb-4 leading-relaxed">
              {floq.description}
            </p>
          )}

          {/* Member avatars preview */}
          {floq.members && Array.isArray(floq.members) && floq.members.length > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <div className="flex -space-x-2">
                {floq.members.slice(0, 4).map((member: any, index: number) => (
                  <div
                    key={member.id || index}
                    className="size-8 rounded-full border-2 border-white/30 bg-white/10 flex items-center justify-center text-xs font-medium text-white/80 backdrop-blur-sm"
                    style={{ zIndex: 10 - index }}
                  >
                    {member.avatar_url ? (
                      <img 
                        src={member.avatar_url} 
                        alt={member.display_name}
                        className="size-full rounded-full object-cover"
                      />
                    ) : (
                      member.display_name?.[0]?.toUpperCase() || '?'
                    )}
                  </div>
                ))}
                {floq.members.length > 4 && (
                  <div 
                    className="size-8 rounded-full border-2 border-white/30 bg-white/10 flex items-center justify-center text-xs font-medium text-white/60"
                    style={{ zIndex: 5 }}
                  >
                    +{floq.members.length - 4}
                  </div>
                )}
              </div>
              <span className="text-xs text-white/60">
                {floq.participant_count} member{floq.participant_count !== 1 ? 's' : ''}
              </span>
            </div>
          )}

          {/* Enhanced meta info with better icons */}
          <div className="flex gap-6 text-sm">
            <div 
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm"
              title="Member count"
            >
              <Users 
                className="h-4 w-4" 
                style={{ color: vibeColor }}
              />
              <span className="text-white/90 font-medium">
                {floq.participant_count}{floq.max_participants ? `/${floq.max_participants}` : ''}
              </span>
            </div>
            
            <div 
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm"
              title="Distance"
            >
              <MapPin 
                className="h-4 w-4" 
                style={{ color: vibeColor }}
              />
              <span className="text-white/90 font-medium">
                {formatDistance(floq.distance_meters)}
              </span>
            </div>
            
            <div 
              className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-sm"
              title="Time remaining"
            >
              <Clock 
                className="h-4 w-4" 
                style={{ color: vibeColor }}
              />
              <span className="text-white/90 font-medium">
                {floq.ends_at ? formatTimeLeft(floq.ends_at) : 'Ongoing'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Enhanced action buttons */}
      <div className="relative z-10 flex gap-3">
        <ActionPill 
          variant="primary" 
          label="View Details" 
          className="flex-1"
          style={{ 
            background: `linear-gradient(135deg, ${vibeColor}, ${vibeColor}CC)`,
            color: 'white',
            fontWeight: '600'
          }}
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
          label={floq.is_joined ? "✓ Joined" : isFull ? "Full" : "Join"}
          onClick={handleJoin}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              handleJoin(e as any);
            }
          }}
          disabled={floq.is_joined || isFull}
          className={floq.is_joined ? "text-green-400 border-green-400/50" : ""}
        />
        
        <ActionPill 
          variant="ghost" 
          label="×" 
          onClick={handleHide}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault();
              e.stopPropagation();
              handleHide(e as any);
            }
          }}
          className="px-3 text-white/60 hover:text-red-400 hover:border-red-400/50"
          title="Hide this floq"
        />
      </div>
    </article>
  );
});