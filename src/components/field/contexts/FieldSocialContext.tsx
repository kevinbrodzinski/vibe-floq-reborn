import { createContext, useContext, useMemo } from 'react';
import { getVibeColor } from '@/utils/getVibeColor';
import { useFieldLocation } from './FieldLocationContext';

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

  // Create profiles map for quick lookup with hash-based memoization
  const profilesMap = useMemo(() => {
    return new Map(profiles.map(p => [p.id, p])) as Map<string, ProfileRow>;
  }, [profiles.length, profiles.map(p => p.id).join(',')]);

  // Convert presence data to people format with proper field coordinates
  const people: Person[] = useMemo(() => {
    if (!location?.lat || !location?.lng) return [];
    
    return presenceData.map((presence) => {
      const profile = profilesMap.get(presence.user_id);
      
      // Convert lat/lng to field coordinates based on geographic distance from user
      const latDiff = presence.lat - location.lat!;
      const lngDiff = presence.lng - location.lng!;
      
      // Convert to field coordinates: ~111km per degree lat, ~111km * cos(lat) per degree lng
      const xMeters = lngDiff * 111320 * Math.cos((location.lat! * Math.PI) / 180);
      const yMeters = latDiff * 111320;
      
      // Scale to field coordinates (field is 0-100%, assuming 2km view radius)
      const scale = 50; // 50% field width per km
      const x = Math.min(Math.max((xMeters / 1000) * scale + 50, 5), 95);
      const y = Math.min(Math.max(-(yMeters / 1000) * scale + 50, 5), 95);
      
      return {
        id: presence.user_id,
        name: profile?.display_name || `User ${presence.user_id.slice(-4)}`,
        x,
        y,
        color: getVibeColor(presence.vibe || 'social'),
        vibe: presence.vibe || 'social',
        isFriend: presence.isFriend || false,
      };
    });
  }, [presenceData, profilesMap, location?.lat, location?.lng, getVibeColor]);

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