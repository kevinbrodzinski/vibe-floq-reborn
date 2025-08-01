import React, { useState } from 'react';
import { ScrollView } from 'react-native';
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
    <ScrollView 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      <FriendAlignmentList />
      <MiniDensityMapCard
        className="mt-4"
        onPress={handleMapPress}
      />
      <SuggestedAlignmentActions className="mt-4" />
      
      {/* Existing VibeDensityModal */}
      <VibeDensityModal 
        open={showDensityMap}
        onOpenChange={setShowDensityMap}
      />
    </ScrollView>
  );
};