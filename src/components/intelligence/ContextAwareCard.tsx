import { motion } from 'framer-motion';
import { Brain, Clock, MapPin, TrendingUp, Activity } from 'lucide-react';
import { useContextAI } from '@/hooks/useContextAI';

interface ContextAwareCardProps {
  className?: string;
  compact?: boolean;
}

export function ContextAwareCard({ className = '', compact = false }: ContextAwareCardProps) {
  const { context, isInitialized, factCount, friction } = useContextAI();

  if (!isInitialized) {
    return (
      <motion.div 
        className={`p-4 rounded-lg bg-white/5 backdrop-blur-sm ${className}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
      >
        <div className="flex items-center space-x-2 mb-3">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
          >
            <Brain className="w-4 h-4 text-primary" />
          </motion.div>
          <h3 className="text-sm font-medium text-foreground">Context Memory</h3>
        </div>
        
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <div className="w-2 h-2 rounded-full bg-primary/30 animate-pulse" />
            <p className="text-xs text-muted-foreground">Initializing context awareness...</p>
          </div>
        </div>
      </motion.div>
    );
  }

  if (!context) {
    return (
      <motion.div 
        className={`p-4 rounded-lg bg-white/5 backdrop-blur-sm ${className}`}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
      >
        <div className="flex items-center space-x-2 mb-3">
          <Brain className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium text-foreground">Context Memory</h3>
          <span className="text-xs text-muted-foreground">({factCount} facts)</span>
        </div>
        
        <p className="text-xs text-muted-foreground">Building context awareness...</p>
      </motion.div>
    );
  }

  const { contextualInsights, vibeTransitions, confidence, summary } = context;

  return (
    <motion.div 
      className={`p-4 rounded-lg bg-white/5 backdrop-blur-sm ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center space-x-2">
          <Brain className="w-4 h-4 text-primary" />
          <h3 className="text-sm font-medium text-foreground">Context Memory</h3>
          <span className="text-xs text-muted-foreground">({factCount} facts)</span>
        </div>
        
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
          <span className="text-xs text-muted-foreground">Live</span>
        </div>
      </div>

      <div className="space-y-3">
        {/* Context Summary */}
        <div className="text-xs text-muted-foreground">
          {summary}
        </div>

        {/* Key Insights */}
        {contextualInsights.length > 0 && (
          <div className="space-y-1">
            {contextualInsights.slice(0, compact ? 2 : 4).map((insight) => (
              <div key={insight.id} className="flex items-start space-x-2">
                <div className="mt-0.5">
                  {insight.category === 'temporal' && <Clock className="w-3 h-3 text-primary/70" />}
                  {insight.category === 'venue' && <MapPin className="w-3 h-3 text-primary/70" />}
                  {insight.category === 'energy' && <TrendingUp className="w-3 h-3 text-primary/70" />}
                  {insight.category === 'behavioral' && <Brain className="w-3 h-3 text-primary/70" />}
                </div>
                <p className="text-xs text-foreground leading-relaxed">{insight.text}</p>
              </div>
            ))}
          </div>
        )}

        {/* Vibe Transitions (if not compact) */}
        {!compact && vibeTransitions.length > 0 && (
          <div className="space-y-1">
            <h4 className="text-xs font-medium text-muted-foreground">Recent Patterns</h4>
            {vibeTransitions.slice(0, 2).map((transition, i) => (
              <div key={i} className="text-xs text-muted-foreground">
                <span className="text-foreground">{transition.from}</span> → <span className="text-foreground">{transition.to}</span>
                {transition.trigger && <span className="ml-2 text-primary/70">({transition.trigger})</span>}
              </div>
            ))}
          </div>
        )}

        {/* Friction Indicator */}
        {friction && friction.overall01 > 0.1 && (
          <div className="flex items-center space-x-2">
            <Activity className="w-3 h-3 text-yellow-500" />
            <span className="text-xs text-yellow-500">
              Friction detected ({Math.round(friction.overall01 * 100)}%)
            </span>
          </div>
        )}

        {/* Confidence Bar */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <span className="text-xs text-muted-foreground">Context Confidence</span>
            <span className="text-xs text-foreground">{Math.round(confidence * 100)}%</span>
          </div>
          <div className="w-full bg-muted rounded-full h-1">
            <motion.div
              className="h-1 bg-primary rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${confidence * 100}%` }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
          </div>
        </div>
      </div>
    </motion.div>
  );
}