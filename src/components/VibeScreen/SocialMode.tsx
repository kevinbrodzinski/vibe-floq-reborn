import React, { useState } from 'react';
import { ScrollView } from 'react-native';
import { FriendAlignmentList } from '@/components/VibeScreen/FriendAlignmentList';
import { PreviewButtonsRow } from '@/components/VibeScreen/PreviewButtonsRow';
import { SuggestedAlignmentActions } from '@/components/VibeScreen/SuggestedAlignmentActions';
import { VenueRecommendationsModal } from '@/components/social/VenueRecommendationsModal';
import { VibeDensityModal } from '@/components/screens/VibeDensityModal';
import { NearbyFloqsModal } from '@/components/social/NearbyFloqsModal';

/**
 * SocialMode - Real social features with animated components
 * Friend alignment, venue recommendations, mini map preview, and suggested actions
 */
export const SocialMode: React.FC = () => {
  const [showDensityMap, setShowDensityMap] = useState(false);
  const [showVenues, setShowVenues] = useState(false);
  const [showFloqs, setShowFloqs] = useState(false);

  const handleMapPress = () => {
    setShowDensityMap(true);
  };

  const handleVenuesPress = () => {
    setShowVenues(true);
  };

  const handleFloqsPress = () => {
    setShowFloqs(true);
  };

  return (
    <ScrollView 
      showsVerticalScrollIndicator={false}
      contentContainerStyle={{ paddingBottom: 32 }}
    >
      <FriendAlignmentList />
      
      <PreviewButtonsRow
        className="mt-6"
        onMapPress={handleMapPress}
        onVenuesPress={handleVenuesPress}
        onFloqsPress={handleFloqsPress}
      />
      
      <SuggestedAlignmentActions className="mt-6" />
      
      {/* Modals */}
      <VibeDensityModal 
        open={showDensityMap}
        onOpenChange={setShowDensityMap}
      />
      
      <VenueRecommendationsModal 
        open={showVenues}
        onOpenChange={setShowVenues}
      />
      
      <NearbyFloqsModal 
        open={showFloqs}
        onOpenChange={setShowFloqs}
      />
    </ScrollView>
  );
};