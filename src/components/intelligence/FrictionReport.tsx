import { motion } from 'framer-motion';
import { AlertTriangle, TrendingDown, RotateCcw, Repeat, XCircle } from 'lucide-react';
import { useContextAI } from '@/hooks/useContextAI';
import { cn } from '@/lib/utils';

interface FrictionReportProps {
  className?: string;
  compact?: boolean;
}

/**
 * Friction Report - Shows detected user friction patterns and suggestions
 * Integrates with the FrictionDetector to surface actionable insights
 */
export function FrictionReport({ className = '', compact = false }: FrictionReportProps) {
  const { friction, isInitialized } = useContextAI();

  if (!isInitialized || !friction || friction.overall01 < 0.1) {
    return null;
  }

  const getSignalIcon = (kind: string) => {
    switch (kind) {
      case 'hesitation': return TrendingDown;
      case 'backtracking': return RotateCcw;
      case 'repetition': return Repeat;
      case 'abandonment': return XCircle;
      default: return AlertTriangle;
    }
  };

  const getSignalColor = (score: number) => {
    if (score > 0.7) return 'text-red-500';
    if (score > 0.4) return 'text-yellow-500';
    return 'text-orange-500';
  };

  return (
    <motion.div 
      className={cn(
        "p-4 rounded-lg bg-gradient-to-br from-yellow-500/5 to-orange-500/5 border border-yellow-500/20",
        compact && "p-3",
        className
      )}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center space-x-2 mb-3">
        <AlertTriangle className="w-4 h-4 text-yellow-500" />
        <h3 className="text-sm font-medium text-foreground">Friction Detected</h3>
        <span className="text-xs text-yellow-600">
          {Math.round(friction.overall01 * 100)}% friction score
        </span>
      </div>

      {/* Friction Signals */}
      {friction.signals.length > 0 && (
        <div className="space-y-2 mb-3">
          {friction.signals.slice(0, compact ? 2 : 4).map((signal, i) => {
            const Icon = getSignalIcon(signal.kind);
            const colorClass = getSignalColor(signal.score01);
            
            return (
              <div key={i} className="flex items-start space-x-2">
                <Icon className={cn("w-3 h-3 mt-0.5", colorClass)} />
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-foreground capitalize">
                      {signal.kind.replace('_', ' ')}
                    </span>
                    <span className={cn("text-xs", colorClass)}>
                      {Math.round(signal.score01 * 100)}%
                    </span>
                  </div>
                  {signal.details && (
                    <p className="text-xs text-muted-foreground mt-1">
                      {signal.details}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Suggestions */}
      {friction.suggestions.length > 0 && !compact && (
        <div className="space-y-1 pt-2 border-t border-yellow-500/20">
          <h4 className="text-xs font-medium text-muted-foreground">Suggestions</h4>
          {friction.suggestions.slice(0, 2).map((suggestion, i) => (
            <div key={i} className="text-xs text-foreground/80 leading-relaxed">
              • {suggestion}
            </div>
          ))}
        </div>
      )}

      {/* Time indicator */}
      <div className="flex justify-between items-center mt-2 pt-2 border-t border-yellow-500/20">
        <span className="text-xs text-muted-foreground">
          Detected {new Date(friction.t).toLocaleTimeString()}
        </span>
        <div className="flex items-center space-x-1">
          <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
          <span className="text-xs text-muted-foreground">Live</span>
        </div>
      </div>
    </motion.div>
  );
}