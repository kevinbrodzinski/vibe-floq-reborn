import React from 'react';
import { motion } from 'framer-motion';
import { useContextAI } from '@/hooks/useContextAI';
import { Brain, Clock, MapPin, TrendingUp, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { VibeReading } from '@/core/vibe/types';
import type { ComponentKey } from '@/core/vibe/types';

interface EnhancedWhyThisVibeProps {
  reading: VibeReading;
  className?: string;
  maxReasons?: number;
}

interface VibeReason {
  id: string;
  icon: React.ReactNode;
  text: string;
  strength: number; // 0-1
  contextual?: boolean;
  category: 'component' | 'pattern' | 'context';
}

/**
 * Enhanced Why This Vibe component with context awareness
 * Extends existing vibe explanations with contextual insights
 */
export function EnhancedWhyThisVibe({ 
  reading, 
  className, 
  maxReasons = 4 
}: EnhancedWhyThisVibeProps) {
  const { context } = useContextAI();
  
  // Get component-based reasons (existing logic)
  const componentReasons = React.useMemo((): VibeReason[] => {
    const reasons: VibeReason[] = [];
    const { components } = reading;
    
    // Sort components by strength
    const sortedComponents = Object.entries(components)
      .filter(([key]) => key !== 'weather') // Weather is optional
      .sort(([,a], [,b]) => Math.abs(b) - Math.abs(a));
    
    sortedComponents.slice(0, 2).forEach(([key, value]) => {
      const componentKey = key as ComponentKey;
      const strength = Math.abs(value);
      
      if (strength > 0.3) {
        reasons.push({
          id: `component-${componentKey}`,
          icon: getComponentIcon(componentKey),
          text: getComponentReason(componentKey, value),
          strength,
          category: 'component'
        });
      }
    });
    
    return reasons;
  }, [reading.components]);
  
  // Get pattern-based reasons
  const patternReasons = React.useMemo((): VibeReason[] => {
    const reasons: VibeReason[] = [];
    
    // Add time-based pattern if confidence is high
    if (reading.confidence01 > 0.7) {
      const hour = new Date().getHours();
      const timeReason = getTimeBasedReason(hour, reading.vibe);
      if (timeReason) {
        reasons.push({
          id: 'pattern-time',
          icon: <Clock className="w-3 h-3" />,
          text: timeReason,
          strength: reading.confidence01,
          category: 'pattern'
        });
      }
    }
    
    return reasons;
  }, [reading.vibe, reading.confidence01]);
  
  // Get context-based reasons
  const contextReasons = React.useMemo((): VibeReason[] => {
    if (!context?.contextualInsights) return [];
    
    return context.contextualInsights.slice(0, 2).map(insight => ({
      id: `context-${insight.id}`,
      icon: <Brain className="w-3 h-3" />,
      text: insight.text,
      strength: insight.confidence,
      contextual: true,
      category: 'context' as const
    }));
  }, [context]);
  
  // Combine and sort all reasons
  const allReasons = React.useMemo(() => {
    const combined = [...componentReasons, ...patternReasons, ...contextReasons];
    return combined
      .sort((a, b) => b.strength - a.strength)
      .slice(0, maxReasons);
  }, [componentReasons, patternReasons, contextReasons, maxReasons]);
  
  if (allReasons.length === 0) {
    return (
      <div className={cn("text-xs text-muted-foreground", className)}>
        Building vibe understanding...
      </div>
    );
  }
  
  return (
    <div className={cn("space-y-2", className)}>
      <div className="text-xs font-medium text-foreground/80 mb-2 flex items-center gap-1">
        <Zap className="w-3 h-3" />
        Why this vibe
      </div>
      
      <div className="space-y-1.5">
        {allReasons.map((reason, index) => (
          <motion.div
            key={reason.id}
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-start gap-2 text-xs"
          >
            <div className="flex-shrink-0 mt-0.5 opacity-60">
              {reason.icon}
            </div>
            <div className="flex-1">
              <span className="text-foreground/70">{reason.text}</span>
              {reason.contextual && (
                <span className="text-primary/60 ml-1 text-[10px]">(learned)</span>
              )}
            </div>
            <div className="flex-shrink-0">
              <div className="w-8 h-1 bg-border/30 rounded-full overflow-hidden">
                <motion.div
                  className={cn(
                    "h-full rounded-full",
                    reason.category === 'component' && "bg-primary/60",
                    reason.category === 'pattern' && "bg-secondary/60", 
                    reason.category === 'context' && "bg-accent/60"
                  )}
                  initial={{ width: 0 }}
                  animate={{ width: `${reason.strength * 100}%` }}
                  transition={{ delay: index * 0.1 + 0.2, duration: 0.5 }}
                />
              </div>
            </div>
          </motion.div>
        ))}
      </div>
      
      {/* Context memory indicator */}
      {context && context.factCount > 0 && (
        <div className="mt-3 pt-2 border-t border-border/20">
          <div className="text-[10px] text-muted-foreground flex items-center gap-1">
            <Brain className="w-2.5 h-2.5" />
            Learning from {context.factCount} interactions
          </div>
        </div>
      )}
    </div>
  );
}

// Helper functions
function getComponentIcon(component: ComponentKey): React.ReactNode {
  const iconMap: Record<ComponentKey, React.ReactNode> = {
    circadian: <Clock className="w-3 h-3" />,
    movement: <TrendingUp className="w-3 h-3" />,
    venueEnergy: <MapPin className="w-3 h-3" />,
    deviceUsage: <Zap className="w-3 h-3" />,
    weather: <Cloud className="w-3 h-3" />
  };
  
  return iconMap[component] || <Zap className="w-3 h-3" />;
}

function getComponentReason(component: ComponentKey, value: number): string {
  const intensity = Math.abs(value);
  const direction = value > 0 ? 'high' : 'low';
  
  const reasonMap: Record<ComponentKey, (direction: string, intensity: number) => string> = {
    circadian: (dir) => dir === 'high' ? 'Your circadian rhythm is active' : 'Your natural energy is low',
    movement: (dir) => dir === 'high' ? 'You\'ve been moving around' : 'You\'ve been stationary',
    venueEnergy: (dir) => dir === 'high' ? 'This place energizes you' : 'This environment is calming',
    deviceUsage: (dir) => dir === 'high' ? 'High digital engagement' : 'Low screen time',
    weather: (dir) => dir === 'high' ? 'Weather is energizing' : 'Weather is subdued'
  };
  
  return reasonMap[component]?.(direction, intensity) || 'Component influence detected';
}

function getTimeBasedReason(hour: number, vibe: string): string | null {
  if (hour >= 6 && hour < 10) {
    return 'Morning energy patterns detected';
  } else if (hour >= 14 && hour < 17) {
    return 'Afternoon energy dip is typical';
  } else if (hour >= 20 && hour < 23) {
    return 'Evening wind-down pattern';
  }
  return null;
}

// Import Cloud icon
function Cloud({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 15a4 4 0 004 4h9a5 5 0 10-.1-9.999 5.002 5.002 0 10-9.78 2.096A4.003 4.003 0 003 15z" />
    </svg>
  );
}