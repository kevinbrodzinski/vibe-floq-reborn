import { useEffect, useRef, useState } from 'react';
import { EnhancedVenueIntelligence } from '@/core/vibe/collectors/EnhancedVenueIntelligence';
import { estimateVenuePulse } from '@/core/venue/PulseEstimator';
import { updatePersonEnergy, type PersonState, type GroupState } from '@/core/field/FieldCoupling';
import { useEnhancedPresence } from '@/hooks/useEnhancedPresence';
import { useVibeEngine } from '@/hooks/useVibeEngine';

export function useFieldHeartbeat() {
  const { currentVibe, isDetecting } = useVibeEngine();
  const presence = useEnhancedPresence();
  const ven = useRef(new EnhancedVenueIntelligence());
  const tickRef = useRef<number | null>(null);
  const [personState, setPersonState] = useState<PersonState>({
    energy: 0.5,
    slope: 0,
    momentum: 0,
    vibe: currentVibe || 'social',
    friendsPresent: 0
  });

  useEffect(() => {
    if (!isDetecting) return;

    function loop() {
      // Update person state based on current vibe and presence data
      if (currentVibe && presence.location) {
        // Get venue intelligence for current location
        if (presence.location.coords?.lat && presence.location.coords?.lng) {
          const lngLat = { 
            lat: presence.location.coords.lat, 
            lng: presence.location.coords.lng 
          };
          ven.current.getVenueIntelligence(lngLat).then(venueIntel => {
          if (venueIntel) {
            const venuePulse = estimateVenuePulse(venueIntel);
            
            // Create minimal group state from presence data
            const groupState: GroupState | undefined = presence.nearby_users?.length ? {
              energy: 0.6, // default group energy
              cohesion: 0.7, // assume good cohesion for friends
              fragmentationRisk: 0.2,
              size: presence.nearby_users.length + 1
            } : undefined;

            // Update person energy based on venue and group coupling
            setPersonState(prev => {
              const updated = updatePersonEnergy({
                ...prev,
                vibe: currentVibe,
                friendsPresent: presence.nearby_users?.length ? 
                  Math.min(1, presence.nearby_users.length / 5) : 0
              }, venueIntel, groupState);
              
              return updated;
            });
          }
          }).catch(() => {
            // Silent fail - venue intelligence not available
          });
        }
      }

      tickRef.current = self.setTimeout(loop, 1500);
    }

    loop();
    return () => { 
      if (tickRef.current) clearTimeout(tickRef.current); 
    };
  }, [currentVibe, isDetecting, presence.location, presence.nearby_users]);

  return {
    personState,
    isActive: isDetecting,
    location: presence.location
  };
}