import { createContext, useContext, useMemo, useState, useEffect } from 'react';
import { getVibeColor } from '@/utils/getVibeColor';
import { useFieldLocation } from './FieldLocationContext';
import { useSelectedFloq } from '@/components/maps/FieldWebMap';
import { projectToScreen, onMapReady } from '@/lib/geo/project';

export interface ProfileRow {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  bio: string | null;
}

export interface Person {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
  vibe: string;
  isFriend?: boolean;
}

interface FieldSocialContextValue {
  people: Person[];
  profilesMap: Map<string, ProfileRow>;
  profiles: ProfileRow[];
}

const FieldSocialContext = createContext<FieldSocialContextValue | null>(null);

interface FieldSocialProviderProps {
  children: React.ReactNode;
  profiles: ProfileRow[];
}

export const FieldSocialProvider = ({ children, profiles }: FieldSocialProviderProps) => {
  console.log('[FieldSocialProvider] Rendering with profiles:', profiles);
  
  // Track map ready state for reactivity
  const [mapReadyFlag, setMapReadyFlag] = useState(0);
  
  useEffect(() => {
    onMapReady(() => setMapReadyFlag(v => v + 1));
  }, []);
  
  // Safely try to get field location context
  let location, presenceData;
  try {
    const fieldLocation = useFieldLocation();
    location = fieldLocation.location;
    presenceData = fieldLocation.presenceData;
    console.log('[FieldSocialProvider] Successfully got field location:', { location, presenceData });
  } catch (error) {
    console.error('[FieldSocialProvider] Failed to get field location context:', error);
    // Provide fallback values
    location = { coords: null, status: 'idle' };
    presenceData = [];
  }
  
  const { selectedFloqMembers } = useSelectedFloq();

  // Create profiles map for quick lookup with hash-based memoization
  const profilesMap = useMemo(() => {
    return new Map(profiles.map(p => [p.id, p])) as Map<string, ProfileRow>;
  }, [profiles.length, profiles.map(p => p.id).join(',')]);

  // Convert presence data to people format with proper field coordinates
  const people: Person[] = useMemo(() => {
    if (!location?.coords?.lat || !location?.coords?.lng) return [];
    
    let filteredPresenceData = presenceData;
    
    // Filter by selected floq members if a floq is selected
    if (selectedFloqMembers && selectedFloqMembers.length > 0) {
      filteredPresenceData = presenceData.filter(presence => {
        const profileId = presence.profile_id || presence.user_id;
        return profileId && selectedFloqMembers.includes(profileId);
      });
    }
    
    return filteredPresenceData.map((presence) => {
      // Use profile_id for new data structure, fallback to user_id for legacy data
      const profileId = presence.profile_id || presence.user_id;
      if (!profileId) {
        console.warn('[FieldSocialContext] Presence data missing profile_id/user_id:', presence);
        return null;
      }
      
      const profile = profilesMap.get(profileId);
      
      // Extract lat/lng from presence data (handle both geometry and lat/lng formats)
      let presenceLat: number, presenceLng: number;
      
      if (presence.location && presence.location.coordinates) {
        // New geometry format: [longitude, latitude]
        presenceLng = presence.location.coordinates[0];
        presenceLat = presence.location.coordinates[1];
      } else if (presence.lat && presence.lng) {
        // Old lat/lng format (fallback for mock data)
        presenceLat = presence.lat;
        presenceLng = presence.lng;
      } else {
        // Skip if no location data
        console.warn('[FieldSocialContext] Presence data missing location:', presence);
        return null;
      }
      
      // Use safe map projection
      const projection = projectToScreen(presenceLat, presenceLng);
      if (!projection) {
        // Map not ready → skip this person (will recompute when map loads)
        return null;
      }
      
      const { x, y } = projection;
      
      return {
        id: profileId,
        name: profile?.display_name || `User ${profileId?.slice(-4) || 'unknown'}`,
        x,
        y,
        color: getVibeColor(presence.vibe || 'social'),
        vibe: presence.vibe || 'social',
        isFriend: presence.isFriend || false,
      };
    }).filter(Boolean); // Remove null entries
  }, [presenceData, profilesMap, location?.coords?.lat, location?.coords?.lng, selectedFloqMembers, mapReadyFlag]);

  const value = {
    people,
    profilesMap,
    profiles,
  };

  return (
    <FieldSocialContext.Provider value={value}>
      {children}
    </FieldSocialContext.Provider>
  );
};

export const useFieldSocial = () => {
  const context = useContext(FieldSocialContext);
  if (!context) {
    throw new Error('useFieldSocial must be used within a FieldSocialProvider');
  }
  return context;
};