import React, { useState, useEffect } from 'react';
import { InlineFriendCarousel } from '@/components/social/InlineFriendCarousel';
import { PreviewButtonsRow } from '@/components/VibeScreen/PreviewButtonsRow';
import { SuggestedAlignmentActions } from '@/components/VibeScreen/SuggestedAlignmentActions';
import { VibeContextHeader } from '@/components/VibeScreen/VibeContextHeader';
import { EnhancedHotspotPreview } from '@/components/VibeScreen/EnhancedHotspotPreview';
import { VenueRecommendationsModal } from '@/components/social/VenueRecommendationsModal';
import { VibeDensityModal } from '@/components/screens/VibeDensityModal';
import { NearbyFloqsModal } from '@/components/social/NearbyFloqsModal';
import { NearbyPeopleModal } from '@/components/social/NearbyPeopleModal';
import { LocationFallback } from '@/components/LocationFallback';
import { useEnhancedLocationSharing } from '@/hooks/location/useEnhancedLocationSharing';
import { LocationEnhancedVibeSystem } from '@/lib/vibeAnalysis/LocationEnhancedVibeSystem';
import { useVibe } from '@/lib/store/useVibe';
import { useSensorMonitoring } from '@/hooks/useSensorMonitoring';
import { useVibeDetection } from '@/store/useVibeDetection';
import type { EnhancedSocialContextData } from '@/lib/vibeAnalysis/VibeSystemIntegration';
import { useRealProximityData } from '@/hooks/useRealProximityData';

/**
 * SocialMode - Real social features with proximity intelligence
 * Now integrates with LocationEnhancedVibeSystem for context-aware social recommendations
 */
export const SocialMode: React.FC = () => {
  const [showDensityMap, setShowDensityMap] = useState(false);
  const [showVenues, setShowVenues] = useState(false);
  const [showFloqs, setShowFloqs] = useState(false);
  const [showPeople, setShowPeople] = useState(false);

  // Enhanced system integration
  const { vibe: currentVibe } = useVibe();
  const { autoMode } = useVibeDetection();
  const { sensorData } = useSensorMonitoring(autoMode);
  const enhancedLocation = useEnhancedLocationSharing();
  const [vibeSystem] = useState(() => new LocationEnhancedVibeSystem());
  const [socialData, setSocialData] = useState<EnhancedSocialContextData | null>(null);
  
  // Get real proximity data instead of mock data
  const { proximityFriends, proximityInsights, isLoading: proximityLoading } = useRealProximityData();

  // Update social context data when location or vibe changes
  useEffect(() => {
    const updateSocialData = async () => {
      if (!enhancedLocation.location || !currentVibe) return;

      try {
        // Get enhanced social context data using real proximity friends
        const data = await vibeSystem.getLocationEnhancedSocialContextData(
          enhancedLocation.location,
          currentVibe as any,
          proximityFriends
        );
        setSocialData(data);
      } catch (error) {
        console.error('Failed to update social data:', error);
      }
    };

    updateSocialData();
  }, [vibeSystem, enhancedLocation, currentVibe, proximityFriends]);

  const handleMapPress = () => {
    setShowDensityMap(true);
  };

  const handleVenuesPress = async () => {
    // Enhanced venue suggestions based on current context
    if (socialData && enhancedLocation.location) {
      try {
        const suggestions = await vibeSystem.getLocationAwareContextualSuggestions(
          currentVibe,
          enhancedLocation,
          { type: 'venues', socialContext: socialData }
        );
        console.log('Enhanced venue suggestions:', suggestions);
      } catch (error) {
        console.error('Failed to get enhanced venue suggestions:', error);
      }
    }
    setShowVenues(true);
  };

  const handleFloqsPress = async () => {
    // Enhanced floq suggestions based on proximity data
    if (proximityInsights && socialData) {
      console.log('Proximity-aware floq suggestions:', {
        nearbyFriends: proximityInsights.nearbyFriendsCount,
        socialMomentum: socialData.proximityIntelligence?.socialMomentum?.score || 0,
        alignment: socialData.alignment
      });
    }
    setShowFloqs(true);
  };

  const handlePeoplePress = async () => {
    // Enhanced people suggestions with proximity intelligence
    if (socialData && enhancedLocation.location) {
      try {
        const suggestions = await vibeSystem.getLocationAwareContextualSuggestions(
          currentVibe,
          enhancedLocation,
          { type: 'people', socialContext: socialData }
        );
        console.log('Proximity-enhanced people suggestions:', suggestions);
      } catch (error) {
        console.error('Failed to get enhanced people suggestions:', error);
      }
    }
    setShowPeople(true);
  };

  return (
    <div className="overflow-y-auto pb-8">
      <VibeContextHeader />
      
      {/* Show location fallback if there are location errors */}
      {enhancedLocation.error && (
        <LocationFallback 
          error={enhancedLocation.error}
          onRetry={() => {
            // Trigger location refresh if available
            if (enhancedLocation.requestLocation) {
              enhancedLocation.requestLocation();
            }
          }}
        />
      )}
      
      {/* Enhanced Friend Carousel with Proximity Data */}
      <InlineFriendCarousel 
        {...{ proximityData: proximityInsights, socialContext: socialData } as any}
      />
      
      {/* Enhanced Hotspot Preview (replaces MiniDensityMapCard) */}
      {socialData && enhancedLocation.location && (
        <div className="px-4 mb-4">
          <EnhancedHotspotPreview
            {...{ socialData, location: enhancedLocation.location, onPress: handleMapPress } as any}
          />
        </div>
      )}
      
      <PreviewButtonsRow
        className="mt-6"
        onMapPress={handleMapPress}
        onVenuesPress={handleVenuesPress}
        onFloqsPress={handleFloqsPress}
        onPeoplePress={handlePeoplePress}
      />
      
      {/* Enhanced Suggested Alignment Actions with Proximity Intelligence */}
      <SuggestedAlignmentActions 
        className="mt-6" 
      />
      
      {/* Proximity Intelligence Summary */}
      {proximityInsights && (
        <div className="px-4 mt-4">
          <div className="bg-card/40 backdrop-blur-sm rounded-xl p-4 border border-border/30">
            <h3 className="text-sm font-medium text-foreground mb-2">Proximity Intelligence</h3>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex flex-col">
                <span className="text-muted-foreground">Nearby Friends</span>
                <span className="text-foreground font-medium">{proximityInsights.nearbyFriendsCount}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground">Avg Distance</span>
                <span className="text-foreground font-medium">
                  {proximityInsights.averageDistance ? `${Math.round(proximityInsights.averageDistance)}m` : 'N/A'}
                </span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground">High Confidence</span>
                <span className="text-foreground font-medium">{proximityInsights.highConfidenceConnections}</span>
              </div>
              <div className="flex flex-col">
                <span className="text-muted-foreground">Recent Activity</span>
                <span className="text-foreground font-medium">{proximityInsights.recentActivity}</span>
              </div>
            </div>
          </div>
        </div>
      )}
      
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

      <NearbyPeopleModal 
        open={showPeople} 
        onOpenChange={setShowPeople}
      />
    </div>
  );
};