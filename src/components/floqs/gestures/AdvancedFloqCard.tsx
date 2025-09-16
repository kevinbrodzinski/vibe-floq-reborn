import React from 'react';
import { motion } from 'framer-motion';
import { useAdvancedFloqGestures } from '@/hooks/useAdvancedFloqGestures';
import { usePerformanceOptimization } from '@/hooks/usePerformanceOptimization';
import { openFloqPeek } from '@/lib/peek';
import { FloqCardItem } from '../cards/FloqCard';
import { cn } from '@/lib/utils';

interface AdvancedFloqCardProps {
  item: FloqCardItem;
  children: React.ReactNode;
  className?: string;
  onSave?: () => void;
  onJoin?: () => void;
}

export function AdvancedFloqCard({ 
  item, 
  children, 
  className,
  onSave,
  onJoin 
}: AdvancedFloqCardProps) {
  const { shouldReduceMotion } = usePerformanceOptimization();
  
  const {
    bind,
    gestureActive,
    pressureIntensity,
    currentStage,
    getScaleTransform,
    getPressureGlow,
    getCommitmentColor
  } = useAdvancedFloqGestures({
    floqId: item.id,
    onPeek: () => openFloqPeek(item.id),
    onSave,
    onJoin
  });

  // Performance-aware animations
  const animationProps = shouldReduceMotion ? {} : {
    animate: {
      scale: getScaleTransform(),
      boxShadow: pressureIntensity > 0.5 
        ? `0 0 ${20 * pressureIntensity}px ${getCommitmentColor()}40`
        : 'none'
    },
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 30
    }
  };

  // Commitment stage visual feedback
  const commitmentBorder = currentStage === "commit" 
    ? "border-success/50" 
    : currentStage === "consider" 
    ? "border-warning/30"
    : "border-border";

  // Gesture feedback overlay
  const gestureOverlay = gestureActive && !shouldReduceMotion && (
    <motion.div
      className="absolute inset-0 rounded-2xl pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ 
        opacity: pressureIntensity * 0.3,
        background: `linear-gradient(135deg, ${getCommitmentColor()}20, transparent)`
      }}
      exit={{ opacity: 0 }}
    />
  );

  return (
    <div
      {...bind()}
      className={cn(
        "relative cursor-pointer select-none",
        "transition-all duration-200",
        commitmentBorder,
        className
      )}
      style={{
        touchAction: 'pan-y pinch-zoom', // Allow vertical scrolling but capture horizontal gestures
        transform: shouldReduceMotion ? 'none' : `scale(${getScaleTransform()})`,
        boxShadow: shouldReduceMotion ? 'none' : (
          pressureIntensity > 0.5 
            ? `0 0 ${20 * pressureIntensity}px ${getCommitmentColor()}40`
            : 'none'
        )
      }}
    >
      {gestureOverlay}
      
      {/* Pressure intensity indicator */}
      {pressureIntensity > 0.3 && !shouldReduceMotion && (
        <div 
          className="absolute top-2 right-2 w-3 h-3 rounded-full"
          style={{
            backgroundColor: getCommitmentColor(),
            opacity: pressureIntensity
          }}
        />
      )}

      {/* Commitment stage indicator */}
      <div className="absolute top-2 left-2">
        <div className={cn(
          "w-2 h-2 rounded-full transition-all duration-200",
          currentStage === "commit" && "bg-success scale-125",
          currentStage === "consider" && "bg-warning scale-110", 
          currentStage === "watch" && "bg-muted scale-100"
        )} />
      </div>

      {/* Swipe hint indicators (subtle) */}
      {gestureActive && !shouldReduceMotion && (
        <>
          <div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-r from-success/20 to-transparent rounded-r" />
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-8 bg-gradient-to-l from-primary/20 to-transparent rounded-l" />
        </>
      )}

      {children}
    </div>
  );
}