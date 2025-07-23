
import React from 'react';
import { MapPin, Waves } from 'lucide-react';
import { EmptyState } from '@/components/EmptyState';

interface VibeDensityEmptyProps {
  isLoading: boolean;
  error: string | null;
  clustersCount: number;
}

export const VibeDensityEmpty: React.FC<VibeDensityEmptyProps> = ({ 
  isLoading, 
  error, 
  clustersCount 
}) => {
  if (isLoading) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm">
        <div className="flex flex-col items-center gap-3">
          <Waves className="h-8 w-8 animate-pulse text-primary" />
          <p className="text-sm text-muted-foreground">Reading the vibes...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-background/90 backdrop-blur-sm">
        <EmptyState
          title="Connection Lost"
          description={`Unable to load vibe data: ${error}`}
          variant="modal"
        />
      </div>
    );
  }

  if (clustersCount === 0) {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-background/60 backdrop-blur-sm">
        <EmptyState
          title="No Vibes Detected"
          description="This area is quiet right now. Try zooming out or moving to a busier location to see live vibes."
          variant="modal"
        >
          <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
            <MapPin className="h-3 w-3" />
            <span>Pan around the map to explore different areas</span>
          </div>
        </EmptyState>
      </div>
    );
  }

  return null;
};
