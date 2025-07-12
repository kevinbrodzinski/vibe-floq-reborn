import React, { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Coffee, Zap, Users, Navigation, Plus, Heart, Star, Sparkles, Sliders, GripHorizontal } from "lucide-react";
import { CreateFloqSheet } from "@/components/CreateFloqSheet";
import { motion, AnimatePresence, PanInfo } from "framer-motion";

interface TimeBasedActionCardProps {
  timeState: string;
  onTimeWarpToggle: () => void;
  className?: string;
}

type SnapPosition = 'collapsed' | 'expanded';

// Transform-based positioning for 60fps performance
const SNAP_TRANSFORMS = {
  collapsed: 'translateY(calc(100% - 60px))',
  expanded: 'translateY(0px)',
} as const;

// Spring physics configuration
const SPRING_CONFIG = {
  type: "spring",
  stiffness: 350,
  damping: 35,
  mass: 0.7,
} as const;

// Haptic feedback patterns
const HAPTIC_PATTERNS = {
  light: 10,
  medium: 20,
  heavy: 50,
} as const;

// Action button interface
interface ActionButton {
  icon: typeof Coffee;
  label: string;
  variant: 'primary' | 'secondary' | 'outline';
  onClick?: () => void;
  iconOnly?: boolean;
}

export const TimeBasedActionCard = ({ timeState, onTimeWarpToggle, className }: TimeBasedActionCardProps) => {
  const [createFloqOpen, setCreateFloqOpen] = useState(false);
  const [snapPosition, setSnapPosition] = useState<SnapPosition>('collapsed');
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const liveRegionRef = useRef<HTMLDivElement>(null);

  // Memoized handlers to prevent re-renders
  const handleCreateFloq = useCallback(() => {
    setCreateFloqOpen(true);
  }, []);

  // Haptic feedback helper
  const triggerHaptic = useCallback((pattern: keyof typeof HAPTIC_PATTERNS) => {
    if ('vibrate' in navigator) {
      navigator.vibrate(HAPTIC_PATTERNS[pattern]);
    }
  }, []);

  // Announce snap changes for screen readers
  useEffect(() => {
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = snapPosition === 'collapsed' 
        ? 'Action card collapsed' 
        : 'Action card expanded';
    }
  }, [snapPosition]);

  // Memoized drag handlers
  const handleDragStart = useCallback(() => {
    setIsDragging(true);
    triggerHaptic('light');
  }, [triggerHaptic]);

  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    const { velocity, offset } = info;
    const velocityThreshold = 300;
    const dragThreshold = 50;
    
    let newPosition: SnapPosition = snapPosition;
    
    // Velocity-based snapping with magnetism
    if (Math.abs(velocity.y) > velocityThreshold) {
      if (velocity.y > 0) {
        newPosition = 'collapsed';
      } else {
        newPosition = 'expanded';
      }
    } else {
      // Position-based snapping
      if (Math.abs(offset.y) > dragThreshold) {
        newPosition = offset.y > 0 ? 'collapsed' : 'expanded';
      }
    }
    
    if (newPosition !== snapPosition) {
      setSnapPosition(newPosition);
      triggerHaptic('medium');
    }
    
    setIsDragging(false);
  }, [snapPosition, triggerHaptic]);

  // Memoized toggle handler
  const handleToggleExpansion = useCallback(() => {
    const newPosition = snapPosition === 'collapsed' ? 'expanded' : 'collapsed';
    setSnapPosition(newPosition);
    triggerHaptic('medium');
  }, [snapPosition, triggerHaptic]);

  // Keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        handleToggleExpansion();
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (snapPosition === 'collapsed') {
          setSnapPosition('expanded');
          triggerHaptic('light');
        }
        break;
      case 'ArrowDown':
        e.preventDefault();
        if (snapPosition === 'expanded') {
          setSnapPosition('collapsed');
          triggerHaptic('light');
        }
        break;
    }
  }, [snapPosition, handleToggleExpansion, triggerHaptic]);

  // Memoized content to prevent unnecessary re-renders
  const actionContent = useMemo(() => {
    const baseButtons: ActionButton[] = [];
    let subtitle = "";
    let title = "";

    switch (timeState) {
      case 'dawn':
        subtitle = "Gentle morning energy";
        title = "Set your intention";
        baseButtons.push(
          { icon: Coffee, label: "Morning Ritual", variant: "primary" },
          { icon: Sparkles, label: "Set Vibe", variant: "secondary" }
        );
        break;
      
      case 'morning':
        subtitle = "Energetic clarity";
        title = "Connect & create";
        baseButtons.push(
          { icon: Zap, label: "Find Energy", variant: "primary" },
          { icon: Plus, label: "Start Something", variant: "secondary", onClick: handleCreateFloq }
        );
        break;
      
      case 'afternoon':
        subtitle = "Steady focus";
        title = "Check the pulse";
        baseButtons.push(
          { icon: Users, label: "See Who's Around", variant: "primary" },
          { icon: Sliders, label: "", variant: "outline", onClick: onTimeWarpToggle, iconOnly: true }
        );
        break;
      
      case 'evening':
      case 'night':
        subtitle = "3 friends are vibing at";
        title = "Warehouse — join?";
        baseButtons.push(
          { icon: Navigation, label: "Let Pulse Guide Me", variant: "primary" },
          { icon: Plus, label: "Create New Floq", variant: "secondary", onClick: handleCreateFloq },
          { icon: Sliders, label: "", variant: "outline", onClick: onTimeWarpToggle, iconOnly: true }
        );
        break;
      
      case 'late':
        subtitle = "Intimate reflection";
        title = "Close connections";
        baseButtons.push(
          { icon: Heart, label: "Intimate Circle", variant: "primary" },
          { icon: Star, label: "Reflect", variant: "secondary" }
        );
        break;
      
      default:
        return null;
    }

    return { subtitle, title, buttons: baseButtons };
  }, [timeState, handleCreateFloq, onTimeWarpToggle]);

  // Reduced motion support
  const prefersReducedMotion = useMemo(() => 
    window.matchMedia('(prefers-reduced-motion: reduce)').matches, []
  );

  if (!actionContent) return null;

  const currentTransform = SNAP_TRANSFORMS[snapPosition];
  const isCollapsed = snapPosition === 'collapsed';

  return (
    <>
      <motion.div
        ref={containerRef}
        className={`fixed left-4 right-4 z-10 pointer-events-auto will-change-transform ${className || ''}`}
        style={{
          bottom: `calc(var(--mobile-nav-height, 75px) + env(safe-area-inset-bottom))`,
          touchAction: 'pan-y',
        }}
        initial={{ 
          transform: 'translateY(100%)', 
          opacity: 0 
        }}
        animate={{ 
          transform: currentTransform,
          opacity: 1,
        }}
        transition={prefersReducedMotion ? { duration: 0 } : SPRING_CONFIG}
        drag="y"
        dragElastic={0.1}
        dragMomentum={false}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        onKeyDown={handleKeyDown}
        role="region"
        aria-label="Time-based actions"
        aria-expanded={!isCollapsed}
        tabIndex={-1}
      >
        <div className="bg-card/95 backdrop-blur-xl rounded-t-3xl border border-border/30 glow-secondary overflow-hidden" style={{ outline: 'none' }}>
          {/* Grabber Handle */}
          <motion.button
            onClick={handleToggleExpansion}
            className="w-full h-12 flex items-center justify-center cursor-grab active:cursor-grabbing touch-manipulation focus:outline-none focus:ring-2 focus:ring-primary/50 focus:ring-inset"
            whileTap={prefersReducedMotion ? {} : { scale: 0.98 }}
            aria-label={`${isCollapsed ? 'Expand' : 'Collapse'} action card`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleToggleExpansion();
              }
            }}
          >
            <motion.div
              animate={{ 
                rotate: isCollapsed ? 0 : 180,
                scale: isDragging ? 1.1 : 1 
              }}
              transition={prefersReducedMotion ? { duration: 0 } : { 
                type: "spring", 
                stiffness: 250, 
                damping: 20 
              }}
              className="w-8 h-1 bg-border rounded-full"
            />
          </motion.button>

          {/* Content */}
          <AnimatePresence>
            {!isCollapsed && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: prefersReducedMotion ? 0 : 0.2, ease: "easeOut" }}
                className="px-6 pb-6"
                style={{ paddingBottom: `calc(1.5rem + env(safe-area-inset-bottom))` }}
              >
                <div className="text-center mb-6">
                  <h3 className="text-base text-muted-foreground">{actionContent.subtitle}</h3>
                  <h2 className="text-xl font-bold text-primary mt-1">{actionContent.title}</h2>
                </div>
                
                <div className="flex space-x-3">
                  {actionContent.buttons.map((button, index) => {
                    const ButtonIcon = button.icon;
                    
                    const buttonClass = button.iconOnly 
                      ? "py-3 px-4 rounded-2xl transition-smooth hover:glow-active"
                      : "flex-1 py-3 px-4 rounded-2xl font-medium transition-smooth flex items-center justify-center space-x-2";

                    const variantClass = button.variant === 'primary'
                      ? "gradient-secondary text-secondary-foreground hover:glow-active"
                      : button.variant === 'outline' 
                      ? "hover:glow-active" 
                      : "hover:glow-secondary";

                    return (
                      <Button
                        key={index}
                        variant={button.variant === 'primary' ? undefined : button.variant}
                        size={button.iconOnly ? "icon" : undefined}
                        className={`${buttonClass} ${button.variant === 'primary' ? variantClass : ''}`}
                        onClick={button.onClick}
                        aria-label={button.iconOnly ? `${button.icon.name} action` : undefined}
                      >
                        <ButtonIcon className="w-4 h-4" />
                        {!button.iconOnly && <span>{button.label}</span>}
                      </Button>
                    );
                  })}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </motion.div>

      {/* Screen reader announcements */}
      <div 
        ref={liveRegionRef}
        aria-live="polite" 
        aria-atomic="true"
        className="sr-only" 
      />

      <CreateFloqSheet 
        open={createFloqOpen} 
        onOpenChange={setCreateFloqOpen} 
      />
    </>
  );
};