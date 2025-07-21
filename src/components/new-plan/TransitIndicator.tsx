import React from 'react';
import { MapPin, Loader2, Clock } from 'lucide-react';
import { useTransitTime, calculateHaversineTime } from '@/hooks/useTransitTimes';

interface TransitIndicatorProps {
  from: {
    lat?: number;
    lng?: number;
  };
  to: {
    lat?: number;
    lng?: number;
  };
  mode?: 'walking' | 'driving' | 'cycling';
  fallbackMinutes?: number;
}

export function TransitIndicator({ from, to, mode = 'walking', fallbackMinutes = 15 }: TransitIndicatorProps) {
  // Only fetch transit data if we have valid coordinates for both stops
  const hasValidCoords = !!(from.lat && from.lng && to.lat && to.lng);
  
  const { data: transitData, isLoading, error } = useTransitTime({
    from: { lat: from.lat || 0, lng: from.lng || 0 },
    to: { lat: to.lat || 0, lng: to.lng || 0 },
    mode,
    enabled: hasValidCoords
  });

  // Calculate fallback time if we have coordinates but API failed
  const fallbackData = hasValidCoords 
    ? calculateHaversineTime(
        { lat: from.lat!, lng: from.lng! },
        { lat: to.lat!, lng: to.lng! },
        mode
      )
    : null;

  // Determine what to display
  let displayTime = fallbackMinutes;
  let confidence: 'high' | 'medium' | 'low' = 'low';
  let isEstimate = true;

  if (transitData) {
    displayTime = transitData.duration_minutes;
    confidence = transitData.confidence;
    isEstimate = transitData.provider === 'haversine';
  } else if (fallbackData && !isLoading) {
    displayTime = fallbackData.duration_minutes;
    confidence = 'low';
    isEstimate = true;
  }

  // Icon based on mode
  const modeIcons = {
    walking: '🚶',
    cycling: '🚴',
    driving: '🚗'
  };

  const icon = modeIcons[mode] || '🚶';

  return (
    <div className="flex items-center justify-center py-2">
      <div className="flex items-center gap-2 px-3 py-1 bg-muted rounded-full text-xs text-muted-foreground">
        {isLoading ? (
          <>
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Calculating...</span>
          </>
        ) : (
          <>
            <MapPin className="w-3 h-3" />
            <span className={`${confidence === 'high' ? 'text-foreground' : ''}`}>
              {isEstimate && '~'}{displayTime} min {icon}
            </span>
            {error && (
              <div title="Using estimated time">
                <Clock className="w-3 h-3 text-orange-500" />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}