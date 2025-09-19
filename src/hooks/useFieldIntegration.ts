// React hook for integrating with the field system
import { useState, useEffect } from 'react';
import { fieldIntegration, type FieldIntegrationState } from '@/core/field/FieldIntegration';
import { useVibeEngine } from './useVibeEngine';
import { useEnhancedPresence } from './useEnhancedPresence';

export function useFieldIntegration() {
  const [fieldState, setFieldState] = useState<FieldIntegrationState>(fieldIntegration.getState());
  const { currentVibe, confidence } = useVibeEngine();
  const presence = useEnhancedPresence();

  // Subscribe to field state changes
  useEffect(() => {
    const unsubscribe = fieldIntegration.onStateChange(setFieldState);
    return () => unsubscribe();
  }, []);

  // Update field system when vibe changes
  useEffect(() => {
    if (currentVibe) {
      fieldIntegration.updatePersonVibe(currentVibe, confidence);
    }
  }, [currentVibe, confidence]);

  // Update field system when presence changes
  useEffect(() => {
    if (presence.nearby_users) {
      fieldIntegration.updateFriendsPresent(presence.nearby_users.length);
    }
  }, [presence.nearby_users]);

  return {
    fieldState,
    
    // Methods to update field state
    updateVenueIntelligence: fieldIntegration.updateVenueIntelligence.bind(fieldIntegration),
    updateGroupMembers: fieldIntegration.updateGroupMembers.bind(fieldIntegration),
    
    // Get enhanced context for recommendations
    getActivityBoosts: () => fieldIntegration.getActivityRecommendationBoosts(),
    getGroupPredictability: (groupId: string) => fieldIntegration.getGroupPredictability(groupId),
    getFieldEnergyContext: () => fieldIntegration.getFieldEnergyContext(),
    
    // Field visualization data
    personState: fieldState.personState,
    groupStates: Array.from(fieldState.groupStates.entries()),
    venueEnergies: Array.from(fieldState.venueEnergies.entries()),
    
    isActive: Boolean(currentVibe) && presence.isLocationReady
  };
}