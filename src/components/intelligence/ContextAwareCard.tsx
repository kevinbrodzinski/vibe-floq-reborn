import React from 'react';
import { motion } from 'framer-motion';
import { useContextAI } from '@/hooks/useContextAI';
import { Brain, TrendingUp, MapPin, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

interface ContextAwareCardProps {
  className?: string;
  compact?: boolean;
}

/**
 * Context-Aware Card - shows contextual intelligence and memory
 * Integrates with existing intelligence system
 */
export function ContextAwareCard({ className, compact = false }: ContextAwareCardProps) {
  const { context, workingSet, isInitialized } = useContextAI();
  const [stats, setStats] = React.useState<any>(null);
  
  // Get context facts count for display
  const factCount = context?.factCount || 0;
  
  if (!isInitialized || !context) {
    return (
      <motion.div 
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className={cn(
          "p-4 rounded-lg bg-gradient-to-br from-primary/5 to-secondary/5 border border-border/50",
          compact && "p-3",
          className
        )}
      >
        <div className="flex items-center gap-2 mb-2">
          <Brain className="w-4 h-4 text-primary animate-pulse" />
          <span className="text-sm font-medium text-foreground">Context AI</span>
        </div>
        <div className="text-xs text-muted-foreground">
          Building context awareness...
        </div>
      </motion.div>
    );
  }
  
  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "p-4 rounded-lg bg-gradient-to-br from-primary/5 to-secondary/5 border border-border/50",
        compact && "p-3",
        className
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium text-foreground">Context Memory</span>
        </div>
        <div className="text-xs text-muted-foreground">
          {factCount} events
        </div>
      </div>
      
      {/* Summary */}
      <div className="text-xs text-foreground/80 mb-3 line-clamp-2">
        {context.summary}
      </div>
      
      {/* Key Insights */}
      <div className="space-y-2 mb-3">
        {context.contextualInsights.slice(0, compact ? 2 : 3).map(insight => (
          <motion.div 
            key={insight.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-start gap-2 text-xs"
          >
            <div className="mt-0.5">
              {insight.category === 'temporal' && <Clock className="w-3 h-3 text-primary/60" />}
              {insight.category === 'venue' && <MapPin className="w-3 h-3 text-secondary/60" />}
              {insight.category === 'energy' && <TrendingUp className="w-3 h-3 text-accent/60" />}
              {insight.category === 'behavioral' && <Brain className="w-3 h-3 text-primary/60" />}
            </div>
            <div className="flex-1">
              <span className="text-foreground/70">{insight.text}</span>
              {insight.contextual && (
                <span className="text-primary/60 ml-1 text-[10px]">(learned)</span>
              )}
            </div>
          </motion.div>
        ))}
      </div>
      
      {/* Recent Patterns */}
      {!compact && context.vibeTransitions.length > 0 && (
        <div className="border-t border-border/30 pt-2">
          <div className="text-[10px] text-muted-foreground mb-1">Recent Transitions</div>
          <div className="flex gap-1 flex-wrap">
            {context.vibeTransitions.slice(0, 3).map((transition, idx) => (
              <div key={idx} className="text-[10px] px-1.5 py-0.5 rounded bg-primary/10 text-primary">
                {transition.from} → {transition.to}
              </div>
            ))}
          </div>
        </div>
      )}
      
      {/* Confidence Indicator */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-border/30">
        <span className="text-[10px] text-muted-foreground">Context Confidence</span>
        <div className="flex items-center gap-1">
          <div className="w-12 h-1 bg-border/30 rounded-full overflow-hidden">
            <motion.div 
              className="h-full bg-gradient-to-r from-primary to-secondary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${context.confidence * 100}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </div>
          <span className="text-[10px] text-foreground/60 ml-1">
            {Math.round(context.confidence * 100)}%
          </span>
        </div>
      </div>
    </motion.div>
  );
}