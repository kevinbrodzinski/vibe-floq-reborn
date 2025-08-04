import React, { useState } from 'react';
import { VibeContextHeader } from '@/components/VibeScreen/VibeContextHeader';
import { useEnhancedLocationSharing } from '@/hooks/location/useEnhancedLocationSharing';
import { useVibe } from '@/lib/store/useVibe';

/**
 * SocialMode - Real social features with proximity intelligence
 * Temporarily simplified to fix TypeScript errors
 */
export const SocialMode: React.FC = () => {
  const [showDensityMap, setShowDensityMap] = useState(false);
  const { vibe: currentVibe } = useVibe();
  const enhancedLocation = useEnhancedLocationSharing();

  const handleMapPress = () => {
    setShowDensityMap(true);
  };

  return (
    <div className="overflow-y-auto pb-8">
      <VibeContextHeader />
      
      {/* Simplified Social Mode UI */}
      <div className="px-4 mt-6">
        <div className="bg-card/40 backdrop-blur-sm rounded-xl p-6 border border-border/30">
          <h2 className="text-lg font-semibold text-foreground mb-4">Social Mode</h2>
          <p className="text-muted-foreground mb-4">
            Enhanced social features with proximity intelligence
          </p>
          
          {enhancedLocation.location && (
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Location:</span>
                <span className="text-foreground">
                  {enhancedLocation.location.lat.toFixed(4)}, {enhancedLocation.location.lng.toFixed(4)}
                </span>
              </div>
              {currentVibe && (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Current Vibe:</span>
                  <span className="text-foreground capitalize">{currentVibe}</span>
                </div>
              )}
            </div>
          )}
          
          <div className="grid grid-cols-2 gap-3 mt-6">
            <button
              onClick={handleMapPress}
              className="bg-primary/20 text-primary border border-primary/30 rounded-lg p-3 text-sm font-medium hover:bg-primary/30 transition-colors"
            >
              Vibe Map
            </button>
            <button
              className="bg-secondary/20 text-secondary-foreground border border-border/30 rounded-lg p-3 text-sm font-medium hover:bg-secondary/30 transition-colors"
            >
              Nearby Friends
            </button>
            <button
              className="bg-secondary/20 text-secondary-foreground border border-border/30 rounded-lg p-3 text-sm font-medium hover:bg-secondary/30 transition-colors"
            >
              Venues
            </button>
            <button
              className="bg-secondary/20 text-secondary-foreground border border-border/30 rounded-lg p-3 text-sm font-medium hover:bg-secondary/30 transition-colors"
            >
              Floqs
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};