import { Button } from "@/components/ui/button";
import { Coffee, Zap, Users, Navigation, Plus, Heart, Star, Sparkles, Sliders, GripHorizontal } from "lucide-react";
import { CreateFloqSheet } from "@/components/CreateFloqSheet";
import { useState, useRef, useCallback, useMemo, useEffect } from "react";
import { motion, AnimatePresence, PanInfo } from "framer-motion";

interface TimeBasedActionCardProps {
  timeState: string;
  onTimeWarpToggle: () => void;
}

type SnapPosition = 'collapsed' | 'expanded';

const SNAP_POSITIONS = {
  collapsed: 20, // Just show grabber
  expanded: 200, // Show full content
} as const;

export const TimeBasedActionCard = ({ timeState, onTimeWarpToggle }: TimeBasedActionCardProps) => {
  const [createFloqOpen, setCreateFloqOpen] = useState(false);
  const [snapPosition, setSnapPosition] = useState<SnapPosition>('collapsed');
  const [isDragging, setIsDragging] = useState(false);
  const dragConstraintsRef = useRef<HTMLDivElement>(null);
  const liveRegionRef = useRef<HTMLDivElement>(null);

  // Memoized handlers to prevent re-renders
  const handleCreateFloq = useCallback(() => {
    setCreateFloqOpen(true);
  }, []);

  const handleToggleExpansion = useCallback(() => {
    setSnapPosition(prev => prev === 'collapsed' ? 'expanded' : 'collapsed');
  }, []);

  // Announce snap changes for screen readers
  useEffect(() => {
    if (liveRegionRef.current) {
      liveRegionRef.current.textContent = snapPosition === 'collapsed' ? 'Action card collapsed' : 'Action card expanded';
    }
  }, [snapPosition]);

  // Handle drag end to snap to nearest position
  const handleDragEnd = useCallback((_: any, info: PanInfo) => {
    const dragDistance = info.offset.y;
    const velocity = info.velocity.y;
    
    // Determine snap based on drag distance and velocity
    const threshold = (SNAP_POSITIONS.expanded - SNAP_POSITIONS.collapsed) / 2;
    
    if (velocity > 300 || dragDistance > threshold) {
      setSnapPosition('collapsed');
    } else if (velocity < -300 || dragDistance < -threshold) {
      setSnapPosition('expanded');
    } else {
      // Snap to closest position
      const currentHeight = snapPosition === 'collapsed' 
        ? SNAP_POSITIONS.collapsed + dragDistance
        : SNAP_POSITIONS.expanded + dragDistance;
      
      const distanceToCollapsed = Math.abs(currentHeight - SNAP_POSITIONS.collapsed);
      const distanceToExpanded = Math.abs(currentHeight - SNAP_POSITIONS.expanded);
      
      setSnapPosition(distanceToCollapsed < distanceToExpanded ? 'collapsed' : 'expanded');
    }
    
    setIsDragging(false);
  }, [snapPosition]);

  const handleDragStart = useCallback(() => {
    setIsDragging(true);
  }, []);

  // Memoized content to prevent unnecessary re-renders
  const actionContent = useMemo(() => {
    switch (timeState) {
      case 'dawn':
        return {
          subtitle: "Gentle morning energy",
          title: "Set your intention",
          buttons: [
            { icon: Coffee, label: "Morning Ritual", variant: "primary" as const },
            { icon: Sparkles, label: "Set Vibe", variant: "secondary" as const }
          ]
        };
      
      case 'morning':
        return {
          subtitle: "Energetic clarity",
          title: "Connect & create",
          buttons: [
            { icon: Zap, label: "Find Energy", variant: "primary" as const },
            { icon: Plus, label: "Start Something", variant: "secondary" as const, onClick: handleCreateFloq }
          ]
        };
      
      case 'afternoon':
        return {
          subtitle: "Steady focus",
          title: "Check the pulse",
          buttons: [
            { icon: Users, label: "See Who's Around", variant: "primary" as const },
            { icon: Sliders, label: "", variant: "outline" as const, onClick: onTimeWarpToggle, iconOnly: true }
          ]
        };
      
      case 'evening':
      case 'night':
        return {
          subtitle: "3 friends are vibing at",
          title: "Warehouse — join?",
          buttons: [
            { icon: Navigation, label: "Let Pulse Guide Me", variant: "primary" as const },
            { icon: Plus, label: "Create New Floq", variant: "secondary" as const, onClick: handleCreateFloq },
            { icon: Sliders, label: "", variant: "outline" as const, onClick: onTimeWarpToggle, iconOnly: true }
          ]
        };
      
      case 'late':
        return {
          subtitle: "Intimate reflection",
          title: "Close connections",
          buttons: [
            { icon: Heart, label: "Intimate Circle", variant: "primary" as const },
            { icon: Star, label: "Reflect", variant: "secondary" as const }
          ]
        };
      
      default:
        return null;
    }
  }, [timeState, handleCreateFloq, onTimeWarpToggle]);

  if (!actionContent) return null;

  const currentHeight = SNAP_POSITIONS[snapPosition];

  return (
    <>
      <div 
        ref={dragConstraintsRef}
        className="fixed inset-0 pointer-events-none z-40"
        style={{ 
          bottom: 'var(--mobile-nav-height, 75px)',
          top: 0 
        }}
      />

      <motion.div
        className="fixed left-0 right-0 z-50 pointer-events-auto"
        style={{
          bottom: 'var(--mobile-nav-height, 75px)',
          willChange: 'transform'
        }}
        initial={{ y: SNAP_POSITIONS.collapsed }}
        animate={{ y: currentHeight }}
        transition={{
          type: "spring",
          damping: 30,
          stiffness: 300,
          mass: 0.8
        }}
        drag="y"
        dragConstraints={dragConstraintsRef}
        dragElastic={0.1}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        role="region"
        aria-label="Time-based action card"
        aria-expanded={snapPosition === 'expanded'}
      >
        <div className="mx-4">
          <div className="bg-card/95 backdrop-blur-xl rounded-t-3xl border border-border/30 glow-secondary overflow-hidden">
            {/* Grabber */}
            <div 
              className="flex justify-center py-3 cursor-grab active:cursor-grabbing"
              onClick={handleToggleExpansion}
              role="button"
              tabIndex={0}
              aria-label="Toggle action card"
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleToggleExpansion();
                }
              }}
            >
              <GripHorizontal 
                className="w-8 h-4 text-muted-foreground" 
                aria-hidden="true"
              />
            </div>

            {/* Content */}
            <AnimatePresence>
              {snapPosition === 'expanded' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  transition={{ duration: 0.2, ease: "easeOut" }}
                  className="px-6 pb-6"
                >
                  <div className="text-center mb-6">
                    <h3 className="text-base text-muted-foreground">{actionContent.subtitle}</h3>
                    <h2 className="text-xl font-bold text-primary mt-1">{actionContent.title}</h2>
                  </div>
                  
                  <div className="flex space-x-3">
                    {actionContent.buttons.map((button, index) => {
                      const buttonProps = {
                        key: index,
                        className: button.iconOnly 
                          ? "py-3 px-4 rounded-2xl transition-smooth hover:glow-active"
                          : "flex-1 py-3 px-4 rounded-2xl font-medium transition-smooth hover:glow-active flex items-center justify-center space-x-2",
                        onClick: button.onClick,
                        ...(button.variant === 'primary' ? {
                          className: "flex-1 gradient-secondary text-secondary-foreground py-3 px-4 rounded-2xl font-medium transition-smooth hover:glow-active flex items-center justify-center space-x-2"
                        } : button.variant === 'outline' ? {
                          variant: "outline" as const,
                          size: button.iconOnly ? "icon" as const : undefined
                        } : {
                          variant: "secondary" as const
                        })
                      };

                      return (
                        <Button {...buttonProps}>
                          <button.icon className="w-4 h-4" />
                          {!button.iconOnly && <span>{button.label}</span>}
                        </Button>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </motion.div>

      {/* Screen reader announcements */}
      <div aria-live="polite" className="sr-only" ref={liveRegionRef} />

      <CreateFloqSheet 
        open={createFloqOpen} 
        onOpenChange={setCreateFloqOpen} 
      />
    </>
  );
};