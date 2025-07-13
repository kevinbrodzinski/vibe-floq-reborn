import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useTimeSyncContext } from "@/components/TimeSyncProvider";
import { useDebug } from "@/lib/useDebug";
import { useFullscreenMap } from "@/store/useFullscreenMap";
import { useSelectedVenue } from "@/store/useSelectedVenue";
import { useOptimizedGeolocation } from "@/hooks/useOptimizedGeolocation";
import { useStableMemo } from "@/hooks/useStableMemo";
import { useFriends } from "@/hooks/useFriends";
import { useBucketedPresence } from "@/hooks/useBucketedPresence";
import { useCurrentEvent } from "@/hooks/useCurrentEvent";
import { useNearbyVenues } from "@/hooks/useNearbyVenues";
import { useActiveFloqs } from "@/hooks/useActiveFloqs";
import type { Vibe } from "@/types";

export interface Person {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
  vibe: string;
  isFriend?: boolean;
}

export interface FloqEvent {
  id: string;
  title: string;
  x: number;
  y: number;
  size: number;
  participants: number;
  vibe: string;
}

export interface FieldData {
  // Location and basic state
  location: ReturnType<typeof useOptimizedGeolocation>;
  isLocationReady: boolean;
  
  // Mode and navigation
  mode: string;
  isFull: boolean;
  isList: boolean;
  navigate: ReturnType<typeof useNavigate>;
  liveRef: React.RefObject<HTMLParagraphElement>;
  
  // People and social data
  people: Person[];
  friends: any[];
  profilesMap: Map<string, any>;
  lastHeartbeat: number | null;
  
  // Events and venues
  floqEvents: FloqEvent[];
  walkableFloqs: any[];
  nearbyVenues: any[];
  currentEvent: any;
  
  // UI state
  currentVibe: Vibe;
  constellationMode: boolean;
  showTimeWarp: boolean;
  showBanner: boolean;
  detailsOpen: boolean;
  venuesSheetOpen: boolean;
  selectedVenueId: string | null;
  timeState: string;
  debug: boolean;
  
  // Actions
  setCurrentVibe: (vibe: Vibe) => void;
  setConstellationMode: (mode: boolean) => void;
  setShowTimeWarp: (show: boolean) => void;
  setShowBanner: (show: boolean) => void;
  setDetailsOpen: (open: boolean) => void;
  setVenuesSheetOpen: (open: boolean) => void;
  setSelectedVenueId: (id: string | null) => void;
  setMode: (mode: string) => void;
}

interface FieldDataProviderProps {
  children: (data: FieldData) => React.ReactNode;
}

export const FieldDataProvider = ({ children }: FieldDataProviderProps) => {
  const [debug] = useDebug();
  const { timeState } = useTimeSyncContext();
  const [showTimeWarp, setShowTimeWarp] = useState(false);
  const [constellationMode, setConstellationMode] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [venuesSheetOpen, setVenuesSheetOpen] = useState(false);
  const { selectedVenueId, setSelectedVenueId } = useSelectedVenue();
  
  const { mode, setMode } = useFullscreenMap();
  const liveRef = useRef<HTMLParagraphElement>(null);
  const navigate = useNavigate();
  
  // Use enhanced geolocation hook
  const location = useOptimizedGeolocation();
  const [currentVibe, setCurrentVibe] = useState<Vibe>('social');
  
  // Integration: Wire up friends and presence data
  const { friends: friendIds, profiles } = useFriends();
  const { people: presenceData, lastHeartbeat } = useBucketedPresence(location.lat, location.lng, friendIds);
  
  // Create profiles map for quick lookup
  const profilesMap = useStableMemo(() => {
    return new Map(profiles.map(p => [p.id, p])) as Map<string, any>;
  }, [profiles.length, profiles.map(p => p.id).join(',')]);
  
  // Get nearby venues for chip and current event
  const { data: nearbyVenues = [] } = useNearbyVenues(location.lat, location.lng, 0.3);
  const { data: currentEvent } = useCurrentEvent(location.lat, location.lng, () => setShowBanner(false));
  
  // Get walkable floqs using the hook
  const { data: activeFloqs = [] } = useActiveFloqs({ limit: 50 });
  const walkable_floqs = activeFloqs.map(floq => ({
    id: floq.id,
    title: floq.title,
    primary_vibe: floq.primary_vibe as Vibe,
    participant_count: floq.participant_count,
    distance_meters: floq.distance_meters || 0,
    starts_at: floq.starts_at
  }));
  
  const isLocationReady = !!(location.lat && location.lng);

  // Convert nearby users to people format for visualization
  const getVibeColor = (vibe: string) => {
    switch (vibe) {
      case 'hype': return 'hsl(280 70% 60%)';
      case 'social': return 'hsl(30 70% 60%)';
      case 'chill': return 'hsl(240 70% 60%)';
      case 'flowing': return 'hsl(200 70% 60%)';
      case 'open': return 'hsl(120 70% 60%)';
      default: return 'hsl(240 70% 60%)';
    }
  };

  // Convert presence data to people format with proper field coordinates
  const people: Person[] = useStableMemo(() => {
    if (!location.lat || !location.lng) return [];
    
    return presenceData.map((presence) => {
      const profile = profilesMap.get(presence.user_id);
      
      // Convert lat/lng to field coordinates based on geographic distance from user
      const latDiff = presence.lat - location.lat;
      const lngDiff = presence.lng - location.lng;
      
      // Convert to field coordinates: ~111km per degree lat, ~111km * cos(lat) per degree lng
      const xMeters = lngDiff * 111320 * Math.cos((location.lat * Math.PI) / 180);
      const yMeters = latDiff * 111320;
      
      // Scale to field coordinates (field is 0-100%, assuming 2km view radius)
      const scale = 50; // 50% field width per km
      const x = Math.min(Math.max((xMeters / 1000) * scale + 50, 5), 95);
      const y = Math.min(Math.max(-(yMeters / 1000) * scale + 50, 5), 95);
      
      return {
        id: presence.user_id,
        name: (profile as any)?.display_name || `User ${presence.user_id.slice(-4)}`,
        x,
        y,
        color: getVibeColor(presence.vibe || 'social'),
        vibe: presence.vibe || 'social',
        isFriend: presence.isFriend || false,
      };
    });
  }, [presenceData, profilesMap, location.lat, location.lng]);

  // Convert friends to extended format for constellation mode
  const friends = useStableMemo(() => {
    return people
      .filter(person => (person as any).isFriend)
      .map((person, index) => ({
        ...person,
        relationship: (index % 3 === 0 ? 'close' : index % 2 === 0 ? 'friend' : 'acquaintance') as 'close' | 'friend' | 'acquaintance',
        activity: 'active' as const,
        warmth: 60 + Math.random() * 40,
        compatibility: 70 + Math.random() * 30,
        lastSeen: Date.now() - Math.random() * 900000,
        avatar_url: (profilesMap.get(person.id) as any)?.avatar_url,
      }));
  }, [people.length, people.filter(p => (p as any).isFriend).length]);

  // Simple floq events conversion for baseline
  const floqEvents: FloqEvent[] = walkable_floqs.map((floq, index) => ({
    id: floq.id,
    title: floq.title,
    x: 30 + (index * 25) % 50,
    y: 40 + (index * 20) % 40,
    size: Math.min(Math.max(40 + floq.participant_count * 8, 40), 100),
    participants: floq.participant_count,
    vibe: floq.primary_vibe,
  }));

  const isFull = mode === 'full';
  const isList = mode === 'list';

  const data: FieldData = {
    // Location and basic state
    location,
    isLocationReady,
    
    // Mode and navigation
    mode,
    isFull,
    isList,
    navigate,
    liveRef,
    
    // People and social data
    people,
    friends,
    profilesMap,
    lastHeartbeat,
    
    // Events and venues
    floqEvents,
    walkableFloqs: walkable_floqs,
    nearbyVenues,
    currentEvent,
    
    // UI state
    currentVibe,
    constellationMode,
    showTimeWarp,
    showBanner,
    detailsOpen,
    venuesSheetOpen,
    selectedVenueId,
    timeState,
    debug,
    
    // Actions
    setCurrentVibe,
    setConstellationMode,
    setShowTimeWarp,
    setShowBanner,
    setDetailsOpen,
    setVenuesSheetOpen,
    setSelectedVenueId,
    setMode,
  };

  return children(data);
};