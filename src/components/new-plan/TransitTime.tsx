import React from 'react';
import { MapPin, Loader2, Clock } from 'lucide-react';
import { useTransitTime, formatTransit, TransitResult } from '@/hooks/useTransitTimes';

interface TransitTimeProps {
  planId: string;
  from: {
    id: string;
    venue?: {
      lat?: number;
      lng?: number;
    } | null;
  };
  to: {
    id: string;
    venue?: {
      lat?: number;
      lng?: number;
    } | null;
  };
  mode?: 'walking' | 'driving' | 'cycling';
  fallbackMinutes?: number;
}

export function TransitTime({ planId, from, to, mode = 'walking', fallbackMinutes = 15 }: TransitTimeProps) {
  // Only fetch if we have valid coordinates and stop IDs
  const hasValidData = !!(
    from.id && 
    to.id && 
    from.venue?.lat && 
    from.venue?.lng && 
    to.venue?.lat && 
    to.venue?.lng
  );

  const { data: transitData, isLoading, error } = useTransitTime(
    planId,
    {
      lat: from.venue?.lat || 0,
      lng: from.venue?.lng || 0,
      stopId: from.id
    },
    {
      lat: to.venue?.lat || 0,
      lng: to.venue?.lng || 0,
      stopId: to.id
    },
    {
      mode,
      enabled: hasValidData
    }
  );

  if (!hasValidData) {
    return (
      <div className="flex items-center justify-center py-2">
        <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full text-xs text-muted-foreground">
          <MapPin className="w-3 h-3" />
          <span>~{fallbackMinutes} min {mode === 'walking' ? '🚶' : mode === 'cycling' ? '🚴' : '🚗'}</span>
        </div>
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-2">
        <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full text-xs text-muted-foreground">
          <Loader2 className="w-3 h-3 animate-spin" />
          <span>Calculating...</span>
        </div>
      </div>
    );
  }

  if (error || !transitData) {
    return (
      <div className="flex items-center justify-center py-2">
        <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full text-xs text-muted-foreground">
          <MapPin className="w-3 h-3" />
          <span>~{fallbackMinutes} min {mode === 'walking' ? '🚶' : mode === 'cycling' ? '🚴' : '🚗'}</span>
          <div title="Using estimated time">
            <Clock className="w-3 h-3 text-orange-500" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-2">
      <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full text-xs text-foreground">
        <MapPin className="w-3 h-3" />
        <span className={transitData.cached ? 'text-muted-foreground' : 'text-foreground'}>
          {formatTransit(transitData)}
        </span>
        {transitData.cached && (
          <span className="text-xs text-muted-foreground">⚡</span>
        )}
      </div>
    </div>
  );
}