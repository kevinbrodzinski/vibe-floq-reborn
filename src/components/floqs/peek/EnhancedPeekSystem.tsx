import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { useEnhancedPeekSystem } from '@/hooks/useEnhancedPeekSystem';
import { useAdvancedFloqGestures } from '@/hooks/useAdvancedFloqGestures';
import { useFloqsHubData } from '@/hooks/useFloqsHubData';
import { FloqDiscoveryView } from '../discovery/FloqDiscoveryView';
import { FloqConsideringView } from '../discovery/FloqConsideringView';
import { FloqCommandCenter } from '../discovery/FlockCommandCenter';
import { Progress } from '@/components/ui/progress';
import { ChevronLeft, ChevronRight, ArrowUp, ArrowDown } from 'lucide-react';
import type { FloqCardItem } from '../cards/FloqCard';

const PEEK_FALLBACK = {
  id: "__peek_fallback__", 
  name: "Loading", 
  status: "live",
  participants: 0, 
  friends_in: 0, 
  recsys_score: 0.5, 
  energy_now: 0.5, 
  energy_peak: 0.7
} as any;

interface EnhancedPeekSystemProps {
  open: boolean;
  floqId: string | null;
  onClose: () => void;
  initialStage?: "watch" | "consider" | "commit";
}

export function EnhancedPeekSystem({ 
  open, 
  floqId, 
  onClose,
  initialStage = "watch"
}: EnhancedPeekSystemProps) {
  const hub = useFloqsHubData();
  const item: FloqCardItem = 
    hub.momentaryLive.find(x => x.id === floqId) ??
    hub.tribes.find(x => x.id === floqId) ??
    hub.publicFloqs.find(x => x.id === floqId) ??
    hub.discover.find(x => x.id === floqId) ??
    PEEK_FALLBACK;

  const {
    currentStage,
    isTransitioning,
    animationProps,
    progressToStage,
    handleSwipeProgression,
    getProgressPercentage,
    canProgressForward,
    canProgressBackward
  } = useEnhancedPeekSystem(initialStage);

  // Gesture handling for stage progression
  const { bind } = useAdvancedFloqGestures({
    floqId: floqId || '',
    onPeek: () => {}, // Already in peek mode
  });

  const handleAction = (action: string, data?: any) => {
    console.log("Enhanced peek action:", action, data);
    // Handle coordination actions like rally point, notifications, etc.
  };

  // Stage transition animations
  const stageVariants = {
    enter: (direction: number) => ({
      x: direction > 0 ? 300 : -300,
      opacity: 0,
      scale: 0.95
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1
    },
    exit: (direction: number) => ({
      x: direction < 0 ? 300 : -300,
      opacity: 0,
      scale: 0.95
    })
  };

  const stageTransition = {
    type: "spring" as const,
    stiffness: 300,
    damping: 30
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent 
        className="sm:max-w-2xl p-0 gap-0 overflow-hidden"
        {...bind()}
      >
        {/* Progress indicator */}
        <div className="px-6 pt-4">
          <Progress 
            value={getProgressPercentage()} 
            className="h-1"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-2">
            <span className={currentStage === "watch" ? "text-primary font-medium" : ""}>
              Watch
            </span>
            <span className={currentStage === "consider" ? "text-primary font-medium" : ""}>
              Consider
            </span>
            <span className={currentStage === "commit" ? "text-primary font-medium" : ""}>
              Commit
            </span>
          </div>
        </div>

        {/* Navigation hints */}
        <div className="flex justify-center items-center gap-4 px-6 py-2 text-xs text-muted-foreground">
          {canProgressBackward && (
            <div className="flex items-center gap-1">
              <ChevronLeft className="w-3 h-3" />
              <span>Previous</span>
            </div>
          )}
          
          <div className="flex items-center gap-2">
            <ArrowUp className="w-3 h-3" />
            <span>Quick commit</span>
          </div>
          
          {canProgressForward && (
            <div className="flex items-center gap-1">
              <span>Next</span>
              <ChevronRight className="w-3 h-3" />
            </div>
          )}
        </div>

        {/* Animated stage content */}
        <motion.div 
          className="relative h-[500px] overflow-hidden"
          style={animationProps}
        >
          <AnimatePresence mode="wait" custom={0}>
            <motion.div
              key={currentStage}
              custom={0}
              variants={stageVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={stageTransition}
              className="absolute inset-0"
            >
              {currentStage === "watch" && (
                <FloqDiscoveryView 
                  item={item}
                  onCommitmentChange={progressToStage}
                  currentStage={currentStage}
                />
              )}
              
              {currentStage === "consider" && (
                <FloqConsideringView 
                  item={item}
                  onCommitmentChange={progressToStage}
                  currentStage={currentStage}
                />
              )}
              
              {currentStage === "commit" && (
                <FloqCommandCenter 
                  item={item}
                  onAction={handleAction}
                />
              )}
            </motion.div>
          </AnimatePresence>
        </motion.div>

        {/* Gesture feedback overlay */}
        {isTransitioning && (
          <motion.div
            className="absolute inset-0 bg-background/20 backdrop-blur-sm pointer-events-none"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          />
        )}
      </DialogContent>
    </Dialog>
  );
}