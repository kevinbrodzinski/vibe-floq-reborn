import React from 'react';

interface VenueLoadingOverlayProps {
  isLoading: boolean;
}

export function VenueLoadingOverlay({ isLoading }: VenueLoadingOverlayProps) {
  if (!isLoading) return null;

  return (
    <div className="absolute top-4 right-4 z-50">
      <div className="bg-background/80 backdrop-blur-sm border rounded-lg px-3 py-2 flex items-center gap-2">
        <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        <span className="text-sm text-muted-foreground">Loading venues...</span>
      </div>
    </div>
  );
}