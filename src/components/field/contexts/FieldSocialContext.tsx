import { createContext, useContext, useMemo } from 'react';
import { getVibeColor } from '@/utils/getVibeColor';
import { useFieldLocation } from './FieldLocationContext';
import { useSelectedFloq } from '@/components/maps/FieldWebMap';
import { projectLatLng } from '@/lib/geo/project';

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
      
      // Enhanced geographic coordinate conversion with proper map projection
      try {
        // Use proper map projection if available
        const projection = projectLatLng(presenceLng, presenceLat);
        if (!projection) {
          // Skip this person if map not ready
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
      } catch (projectionError) {
        // Fallback to manual coordinate conversion if map projection fails
        // Note: At high latitudes (>60°) this approximation can have tens of meters error
        console.warn('[FieldSocialContext] Map projection failed, using geographic fallback:', projectionError);
        
        // Convert lat/lng to screen coordinates using simple geographic conversion
        const latDiff = presenceLat - location.coords!.lat;
        const lngDiff = presenceLng - location.coords!.lng;
        
        // Convert to screen coordinates (assuming 1000px screen width/height)
        const xMeters = lngDiff * 111320 * Math.cos((location.coords!.lat * Math.PI) / 180);
        const yMeters = latDiff * 111320;
        
        // Scale to screen coordinates (field is viewport sized, 2km radius)
        const scale = 200; // pixels per km 
        const x = 500 + (xMeters / 1000) * scale; // Center at 500px + offset
        const y = 500 - (yMeters / 1000) * scale; // Center at 500px + offset (inverted Y)
        
        return {
          id: profileId,
          name: profile?.display_name || `User ${profileId?.slice(-4) || 'unknown'}`,
          x,
          y,
          color: getVibeColor(presence.vibe || 'social'),
          vibe: presence.vibe || 'social',
          isFriend: presence.isFriend || false,
        };
      }
    }).filter(Boolean); // Remove null entries
  }, [presenceData, profilesMap, location?.coords?.lat, location?.coords?.lng, selectedFloqMembers]);

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
  console.log('[FieldSocialContext] Hook called, context value:', FieldSocialContext);
  const context = useContext(FieldSocialContext);
  console.log('[FieldSocialContext] Context result:', context);
  if (!context) {
    console.error('[FieldSocialContext] No context found! Provider not working?');
    throw new Error('useFieldSocial must be used within a FieldSocialProvider');
  }
  return context;
};