import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Users, MapPin, Star } from 'lucide-react';
import { useFloqRealtimeIntegration } from '@/hooks/useFloqRealtimeIntegration';
import { usePerformanceAwareAnimations } from '@/hooks/usePerformanceAwareAnimations';
import { resolveVibeTokens } from '@/lib/vibe/vibeColorResolver';
import { safeVibe } from '@/lib/vibes';
import { cn } from '@/lib/utils';
import type { HubItem } from '@/hooks/useFloqsHubData';

interface FloqCardEnhancedProps {
  floq: HubItem;
  onSave?: () => void;
  onJoin?: () => void;
  onPeek?: () => void;
  onContextMenu?: () => void;
  className?: string;
}

export function FloqCardEnhanced({ 
  floq, 
  onSave, 
  onJoin, 
  onPeek, 
  onContextMenu,
  className 
}: FloqCardEnhancedProps) {
  const { 
    enhancedFloq, 
    isConnected, 
    connectionQuality,
    getVibeInsight,
    isFloqAlive
  } = useFloqRealtimeIntegration(floq.id, floq);

  const { 
    getAnimationClasses, 
    shouldAnimate 
  } = usePerformanceAwareAnimations();

  // Get vibe styling
  const vibeTokens = floq.primary_vibe ? resolveVibeTokens(safeVibe(floq.primary_vibe)) : null;
  const vibeInsight = getVibeInsight();
  const isAlive = isFloqAlive();

  // Connection quality indicator
  const connectionIndicator = () => {
    if (!isConnected) return '🔴';
    switch (connectionQuality) {
      case 'excellent': return '🟢';
      case 'good': return '🟡';
      case 'fair': return '🟠';
      case 'poor': return '🔴';
      default: return '⚪';
    }
  };

  // Simple click handler
  const handleClick = () => {
    onPeek?.();
  };

  // Keyboard handler
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onPeek?.();
    } else if (e.key === 'ArrowRight' && e.altKey) {
      e.preventDefault();
      onJoin?.();
    }
  };

  const cardContent = (
    <div className="space-y-3">
      {/* Header with real-time status */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="font-semibold text-sm line-clamp-1">
            {floq.name || 'Unnamed Floq'}
          </h3>
          {isAlive && (
            <span className="text-xs opacity-60">LIVE</span>
          )}
        </div>
        
        <div className="flex items-center gap-1">
          <span className="text-xs" title={`Connection: ${connectionQuality}`}>
            {connectionIndicator()}
          </span>
        </div>
      </div>

      {/* Real-time participant count */}
      <div className="flex items-center gap-4 text-xs text-muted-foreground">
        <div className="flex items-center gap-1">
          <Users size={12} />
          <span>{enhancedFloq?.participants || floq.participants}</span>
        </div>
        
        {floq.starts_at && (
          <div className="flex items-center gap-1">
            <Clock size={12} />
            <span>{new Date(floq.starts_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
        )}
        
        {(floq as any).distance_m && (
          <div className="flex items-center gap-1">
            <MapPin size={12} />
            <span>{Math.round((floq as any).distance_m)}m</span>
          </div>
        )}
      </div>

      {/* Vibe insight */}
      {vibeInsight && (
        <div className="text-xs p-2 rounded border border-border/50 bg-muted/30">
          <span className="font-medium">{vibeInsight.message}</span>
        </div>
      )}

      {/* Social proof */}
      {(floq as any).friend_inside_count > 0 && (
        <div className="flex items-center gap-1 text-xs text-primary">
          <Star size={12} />
          <span>{(floq as any).friend_inside_count} friend{(floq as any).friend_inside_count !== 1 ? 's' : ''} here</span>
        </div>
      )}

      {/* Energy/vibe indicator */}
      {enhancedFloq?.live_vibe_analysis && (
        <div className="flex items-center justify-between text-xs">
          <span className="text-muted-foreground">
            {enhancedFloq.live_vibe_analysis.dominant_vibe} energy
          </span>
          <div className="w-16 h-1 bg-border rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-500"
              style={{ 
                width: `${enhancedFloq.live_vibe_analysis.energy_level * 100}%` 
              }}
            />
          </div>
        </div>
      )}
    </div>
  );

  const MotionCard = shouldAnimate() ? motion.div : 'div';
  const motionProps = shouldAnimate() ? {
    initial: { opacity: 0, y: 20 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -20 },
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.98 },
    transition: { duration: 0.2 }
  } : {};
  
  return (
    <MotionCard
      {...motionProps}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      tabIndex={0}
      role="button"
      aria-label={`${floq.name || 'Unnamed Floq'} - ${floq.participants} participants`}
      className={cn(
        // Base styles
        "relative p-4 rounded-lg border bg-card text-card-foreground",
        "cursor-pointer select-none outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        
        // Interactive states
        getAnimationClasses().smoothTransform,
        
        // Vibe styling
        vibeTokens && `border-l-4`,
        
        // Performance considerations
        "will-change-transform",
        
        className
      )}
      style={{
        borderLeftColor: vibeTokens?.ring,
        background: vibeTokens ? 
          `linear-gradient(135deg, ${vibeTokens.bg}08 0%, transparent 50%)` : 
          undefined,
        ...vibeTokens && {
          '--vibe-glow': vibeTokens.glow,
          '--vibe-primary': vibeTokens.bg
        }
      }}
    >
      {cardContent}
      
      {/* Hidden description for screen readers */}
      <div className="sr-only">
        Floq starting at {floq.starts_at ? new Date(floq.starts_at).toLocaleTimeString() : 'unknown time'}.
        {enhancedFloq?.live_vibe_analysis && 
          ` Current energy: ${Math.round(enhancedFloq.live_vibe_analysis.energy_level * 100)}%.`
        }
        Use Enter to view details, Alt+Right Arrow for quick join.
      </div>
    </MotionCard>
  );
}