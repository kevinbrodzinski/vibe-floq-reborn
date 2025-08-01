import React, { useState } from 'react';
import { FriendAlignmentList } from '@/components/VibeScreen/FriendAlignmentList';
import { MiniDensityMapCard } from '@/components/VibeScreen/MiniDensityMapCard';
import { SuggestedAlignmentActions } from '@/components/VibeScreen/SuggestedAlignmentActions';
import { VibeDensityModal } from '@/components/screens/VibeDensityModal';

/**
 * SocialMode - Real social features with animated components
 * Friend alignment, mini map preview, and suggested actions
 */
export const SocialMode: React.FC = () => {
  const [showDensityMap, setShowDensityMap] = useState(false);

  const handleMapPress = () => {
    setShowDensityMap(true);
  };

  return (
    <div className="flex-1 overflow-y-auto">
      <div className="pt-4 pb-8">
        <FriendAlignmentList />
        <MiniDensityMapCard
          className="mt-4"
          onPress={handleMapPress}
        />
        <SuggestedAlignmentActions className="mt-4" />
      </div>
      
      {/* Existing VibeDensityModal */}
      <VibeDensityModal 
        open={showDensityMap}
        onOpenChange={setShowDensityMap}
      />
    </div>
  );
};