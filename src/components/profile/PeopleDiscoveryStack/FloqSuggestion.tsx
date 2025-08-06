import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Plus, Loader2 } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';
import { usePlanSuggestions } from '@/hooks/usePlanSuggestions';
import type { PlanSuggestion } from '@/types/discovery';

interface FloqSuggestionProps {
  targetId: string;
  className?: string;
}

export const FloqSuggestion: React.FC<FloqSuggestionProps> = ({ 
  targetId, 
  className 
}) => {
  const { data: suggestions = [] } = usePlanSuggestions(targetId, 3);
  const [hoveredCard, setHoveredCard] = React.useState<string | null>(null);
  const [planningIds, setPlanningIds] = React.useState<Set<string>>(new Set());
  const { socialHaptics } = useHapticFeedback();

  if (!suggestions || suggestions.length === 0) {
    return (
      <Card className={cn("p-4 bg-surface/10 border-border/20 backdrop-blur-sm", className)}>
        <h3 className="text-sm font-medium text-foreground mb-2">Try This Together</h3>
        <div className="text-center py-8">
          <motion.div
            className="w-16 h-16 mx-auto mb-3 rounded-full bg-muted/20 flex items-center justify-center"
            animate={{ rotate: [0, 5, 0, -5, 0] }}
            transition={{ duration: 2, repeat: 3 }}
          >
            <span className="text-2xl">💡</span>
          </motion.div>
          <p className="text-xs text-muted-foreground">
            No suggestions available yet
          </p>
        </div>
      </Card>
    );
  }

  const handlePlanClick = async (suggestion: PlanSuggestion) => {
    socialHaptics.gestureConfirm();
    setPlanningIds(prev => new Set([...prev, suggestion.id]));
    
    // Lazy load confetti for celebration
    try {
      const { default: confetti } = await import('canvas-confetti');
      
      // Simulate plan creation
      setTimeout(() => {
        setPlanningIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(suggestion.id);
          return newSet;
        });
        
        // Trigger cobalt confetti burst
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['hsl(var(--primary))', 'hsl(var(--primary) / 0.8)', 'hsl(var(--primary) / 0.6)']
        });
        
        // Success haptic
        socialHaptics.floqJoined();
      }, 2000);
    } catch (error) {
      console.warn('Confetti not available:', error);
      // Fallback without confetti
      setTimeout(() => {
        setPlanningIds(prev => {
          const newSet = new Set(prev);
          newSet.delete(suggestion.id);
          return newSet;
        });
        socialHaptics.floqJoined();
      }, 2000);
    }
  };

  return (
    <Card className={cn("p-4 bg-surface/10 border-border/20 backdrop-blur-sm", className)}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-medium text-foreground">Try This Together</h3>
        <Badge variant="secondary" className="text-xs">
          {suggestions.length} ideas
        </Badge>
      </div>

      <div 
        className="relative perspective-[600px]"
        style={{ height: '120px' }}
        onMouseLeave={() => setHoveredCard(null)}
      >
        {suggestions.map((suggestion, index) => {
          const isHovered = hoveredCard === suggestion.id;
          const isOtherHovered = hoveredCard && hoveredCard !== suggestion.id;
          const isPlanning = planningIds.has(suggestion.id);
          
          return (
            <motion.div
              key={suggestion.id}
              className={cn(
                "absolute inset-0 cursor-pointer",
                "bg-gradient-to-br from-surface/40 to-surface/20",
                "border border-border/30 rounded-lg p-3",
                "backdrop-blur-sm"
              )}
              style={{
                zIndex: suggestions.length - index,
              }}
              initial={{ 
                rotateY: 0,
                y: index * 4,
                scale: 1 - index * 0.02
              }}
              animate={{
                rotateY: isPlanning ? 180 : 0,
                y: isHovered ? -10 : (isOtherHovered ? index * 8 : index * 4),
                scale: isHovered ? 1.02 : (1 - index * 0.02),
                x: isOtherHovered ? index * 20 : 0
              }}
              transition={{ 
                duration: 0.3,
                ease: 'easeOut'
              }}
              onMouseEnter={() => setHoveredCard(suggestion.id)}
            >
              <AnimatePresence mode="wait">
                {!isPlanning ? (
                  <motion.div
                    key="content"
                    className="h-full flex flex-col justify-between"
                    initial={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                  >
                    <div>
                      <h4 className="text-sm font-medium text-foreground mb-1">
                        {suggestion.title}
                      </h4>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Badge variant="outline" className="text-xs capitalize">
                          {suggestion.vibe}
                        </Badge>
                        <span>•</span>
                        <span>{suggestion.estimated_duration}</span>
                      </div>
                    </div>
                    
                    <Button
                      size="sm"
                      className="mt-3 w-full"
                      onClick={() => handlePlanClick(suggestion)}
                      data-testid={`plan-button-${suggestion.id}`}
                    >
                      <Plus size={14} className="mr-1" />
                      Plan This
                    </Button>
                  </motion.div>
                ) : (
                  <motion.div
                    key="planning"
                    className="h-full flex items-center justify-center"
                    initial={{ opacity: 0, rotateY: 180 }}
                    animate={{ opacity: 1, rotateY: 0 }}
                    transition={{ delay: 0.2 }}
                  >
                    <div className="text-center">
                      <Loader2 size={24} className="animate-spin text-primary mx-auto mb-2" />
                      <p className="text-xs text-muted-foreground">Planning...</p>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      <div className="mt-3 text-xs text-muted-foreground">
        Hover to explore • Click to create plan
      </div>
    </Card>
  );
};