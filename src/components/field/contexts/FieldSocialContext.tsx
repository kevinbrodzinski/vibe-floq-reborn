import { createContext, useContext, useMemo } from 'react';
import { getVibeColor } from '@/utils/getVibeColor';
import { useFieldLocation } from './FieldLocationContext';
import { useSelectedFloq } from '@/components/maps/FieldWebMap';

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
  const { location, presenceData } = useFieldLocation();
  const { selectedFloqMembers } = useSelectedFloq();

  // Create profiles map for quick lookup with hash-based memoization
  const profilesMap = useMemo(() => {
    return new Map(profiles.map(p => [p.id, p])) as Map<string, ProfileRow>;
  }, [profiles.length, profiles.map(p => p.id).join(',')]);

  // Convert presence data to people format with proper field coordinates
  const people: Person[] = useMemo(() => {
    if (!location?.lat || !location?.lng) return [];
    
    let filteredPresenceData = presenceData;
    
    // Filter by selected floq members if a floq is selected
    if (selectedFloqMembers && selectedFloqMembers.length > 0) {
      filteredPresenceData = presenceData.filter(presence => 
        presence.user_id && selectedFloqMembers.includes(presence.user_id)
      );
    }
    
    return filteredPresenceData.map((presence) => {
      // Skip if no user_id
      if (!presence.user_id) {
        console.warn('[FieldSocialContext] Presence data missing user_id:', presence);
        return null;
      }
      
      const profile = profilesMap.get(presence.user_id);
      
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
      
      // Convert lat/lng to field coordinates based on geographic distance from user
      const latDiff = presenceLat - location.lat!;
      const lngDiff = presenceLng - location.lng!;
      
      // Convert to field coordinates: ~111km per degree lat, ~111km * cos(lat) per degree lng
      const xMeters = lngDiff * 111320 * Math.cos((location.lat! * Math.PI) / 180);
      const yMeters = latDiff * 111320;
      
      // Scale to field coordinates (field is 0-100%, assuming 2km view radius)
      const scale = 50; // 50% field width per km
      const x = Math.min(Math.max((xMeters / 1000) * scale + 50, 5), 95);
      const y = Math.min(Math.max(-(yMeters / 1000) * scale + 50, 5), 95);
      
      return {
        id: presence.user_id,
        name: profile?.display_name || `User ${presence.user_id?.slice(-4) || 'unknown'}`,
        x,
        y,
        color: getVibeColor(presence.vibe || 'social'),
        vibe: presence.vibe || 'social',
        isFriend: presence.isFriend || false,
      };
    }).filter(Boolean); // Remove null entries
  }, [presenceData, profilesMap, location?.lat, location?.lng, selectedFloqMembers]);

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