
import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { VibeDensityMap } from '@/components/map/VibeDensityMap';

export const VibeScreen: React.FC = () => {
  const [showMap, setShowMap] = useState(false);

  return (
    <div className="flex flex-col h-full bg-background">
      <div className="flex-1 flex flex-col items-center justify-center p-6">
        <h1 className="text-2xl font-bold mb-4">Vibe Explorer</h1>
        <p className="text-muted-foreground text-center mb-8 max-w-md">
          Discover the emotional landscape around you through our interactive vibe density map.
        </p>
        
        <Button 
          onClick={() => setShowMap(true)}
          size="lg"
          className="mb-4"
        >
          Open Vibe Map
        </Button>
      </div>

      <VibeDensityMap 
        isOpen={showMap}
        onClose={() => setShowMap(false)}
      />
    </div>
  );
};
