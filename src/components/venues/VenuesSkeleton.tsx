import React from 'react';

export const VenuesSkeleton: React.FC = () => {
  return (
    <div className="absolute inset-0 bg-gradient-to-br from-background/90 to-muted/50 backdrop-blur-sm">
      <div className="flex flex-col items-center justify-center h-full space-y-4">
        {/* Pulsing dots animation */}
        <div className="flex space-x-2">
          <div className="w-3 h-3 bg-primary/60 rounded-full animate-pulse"></div>
          <div className="w-3 h-3 bg-primary/60 rounded-full animate-pulse [animation-delay:0.2s]"></div>
          <div className="w-3 h-3 bg-primary/60 rounded-full animate-pulse [animation-delay:0.4s]"></div>
        </div>
        
        {/* Loading text */}
        <div className="text-center space-y-2">
          <div className="text-sm font-medium text-foreground/80">
            Finding venues nearby...
          </div>
          <div className="text-xs text-muted-foreground">
            This may take a moment
          </div>
        </div>
        
        {/* Shimmer cards */}
        <div className="flex flex-col space-y-2 w-full max-w-sm px-6">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-muted/40 rounded-lg animate-pulse"></div>
          ))}
        </div>
      </div>
    </div>
  );
};

export const VenueLoadingOverlay: React.FC<{ show: boolean }> = ({ show }) => {
  if (!show) return null;
  
  return <VenuesSkeleton />;
};