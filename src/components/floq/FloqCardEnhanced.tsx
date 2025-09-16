import React from 'react';
import { motion } from 'framer-motion';
import { Clock, Users, MapPin, Star } from 'lucide-react';
import { useFloqRealtimeIntegration } from '@/hooks/useFloqRealtimeIntegration';
import { useAdvancedFloqGestures } from '@/hooks/useAdvancedFloqGestures';
import { useAccessibleGestures } from '@/hooks/useAccessibleGestures';
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

  const gestureProps = useAdvancedFloqGestures({
    floqId: floq.id,
    onSave,
    onJoin,
    onPeek,
    onContextMenu
  });

  const a11yProps = useAccessibleGestures({
    label: `${floq.name || 'Unnamed Floq'} - ${floq.participants} participants`,
    description: `Floq starting at ${floq.starts_at ? new Date(floq.starts_at).toLocaleTimeString() : 'unknown time'}`,
    onActivate: onPeek,
    onSecondaryAction: onJoin,
    onContextMenu
  });

  const { 
    getMotionVariants, 
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
          {gestureProps.pressureIntensity > 0 && (
            <div 
              className="w-2 h-2 rounded-full bg-primary"
              style={{ 
                opacity: gestureProps.pressureIntensity,
                transform: `scale(${1 + gestureProps.pressureIntensity * 0.5})`
              }}
            />
          )}
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
    variants: getMotionVariants(),
    initial: 'initial',
    animate: 'animate',
    exit: 'exit',
    whileHover: { scale: 1.02 },
    whileTap: { scale: 0.98 }
  } : {};

  const gestureHandlers = gestureProps.bind();
  
  return (
    <MotionCard
      {...motionProps}
      {...(shouldAnimate() ? {} : gestureHandlers)}
      {...a11yProps.getA11yProps()}
      className={cn(
        // Base styles
        "relative p-4 rounded-lg border bg-card text-card-foreground",
        "cursor-pointer select-none outline-none",
        "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        
        // Interactive states
        getAnimationClasses().smoothTransform,
        
        // Gesture feedback
        gestureProps.gestureActive && "ring-1 ring-primary/50",
        
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
        transform: `scale(${gestureProps.getScaleTransform()})`,
        ...vibeTokens && {
          '--vibe-glow': vibeTokens.glow,
          '--vibe-primary': vibeTokens.bg
        }
      }}
    >
      {/* Pressure glow effect */}
      {gestureProps.getPressureGlow() > 0 && (
        <div 
          className="absolute inset-0 rounded-lg pointer-events-none"
          style={{
            background: `radial-gradient(circle at center, ${gestureProps.getCommitmentColor()}20 0%, transparent 70%)`,
            opacity: gestureProps.getPressureGlow()
          }}
        />
      )}
      
      {cardContent}
      
      {/* Hidden description for screen readers */}
      {a11yProps.getA11yProps()['aria-describedby'] && (
        <div 
          id={a11yProps.getA11yProps()['aria-describedby']}
          className="sr-only"
        >
          Floq starting at {floq.starts_at ? new Date(floq.starts_at).toLocaleTimeString() : 'unknown time'}.
          {enhancedFloq?.live_vibe_analysis && 
            ` Current energy: ${Math.round(enhancedFloq.live_vibe_analysis.energy_level * 100)}%.`
          }
          Use Enter to view details, Alt+Right Arrow for quick join, or Context Menu key for options.
        </div>
      )}
    </MotionCard>
  );
}