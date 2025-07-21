import React, { useState, useEffect } from 'react';
import { Navigation, Loader2, AlertTriangle } from 'lucide-react';
import { cn } from '@/lib/utils';
import { calculateTransitTime, formatTransitResult, type TransitResult } from '@/services/transitCalculator';
import type { PlanStopUi } from '@/types/plan';

interface TransitTimeDisplayProps {
  fromStop: PlanStopUi;
  toStop: PlanStopUi;
  className?: string;
  mode?: 'walking' | 'driving' | 'transit' | 'auto';
}

export function TransitTimeDisplay({ 
  fromStop, 
  toStop, 
  className,
  mode = 'auto' 
}: TransitTimeDisplayProps) {
  const [transitResult, setTransitResult] = useState<TransitResult | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const calculateTransit = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        const result = await calculateTransitTime(fromStop, toStop, { mode, optimize: false });
        setTransitResult(result);
      } catch (err) {
        setError('Transit calculation failed');
        // Fallback to default estimate
        setTransitResult({
          duration_minutes: 15,
          distance_meters: 1000,
          mode,
          confidence: 'low',
          provider: 'fallback'
        });
      } finally {
        setIsLoading(false);
      }
    };

    calculateTransit();
  }, [fromStop, toStop, mode]);

  if (isLoading) {
    return (
      <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
        <Loader2 className="w-3 h-3 animate-spin" />
        <span>Calculating route...</span>
      </div>
    );
  }

  if (error && !transitResult) {
    return (
      <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
        <AlertTriangle className="w-3 h-3 text-orange-500" />
        <span>Route unavailable</span>
      </div>
    );
  }

  const confidenceColor = {
    high: 'text-green-600',
    medium: 'text-yellow-600', 
    low: 'text-orange-600'
  }[transitResult?.confidence || 'low'];

  return (
    <div className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}>
      <Navigation className="w-3 h-3" />
      <span className={cn(transitResult?.confidence === 'low' && confidenceColor)}>
        {transitResult ? formatTransitResult(transitResult) : '~15 min'}
      </span>
      {transitResult?.confidence === 'low' && (
        <span className="text-xs text-orange-500">estimated</span>
      )}
    </div>
  );
}