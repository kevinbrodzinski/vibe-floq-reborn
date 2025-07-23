
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
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 z-50 pointer-events-none">
        <div className="bg-background/90 backdrop-blur-sm border rounded-lg p-4 text-center max-w-sm">
          <EmptyState
            title="No vibes detected here yet"
            description="Pan around the map to explore different areas"
            variant="inline"
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground mt-2">
              <MapPin className="h-3 w-3" />
              <span>Zoom out to see more activity</span>
            </div>
          </EmptyState>
        </div>
      </div>
    );
  }

  return null;
};
