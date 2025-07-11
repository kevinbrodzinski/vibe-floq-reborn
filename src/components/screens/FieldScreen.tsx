import { useState, useEffect } from "react";
import { TimeStatusIndicator } from "@/components/TimeStatusIndicator";
import { useTimeSyncContext } from "@/components/TimeSyncProvider";
import { TimeWarpSlider } from "@/components/TimeWarpSlider";
import { SocialGestureManager } from "@/components/SocialGestureManager";
import { FieldHeader } from "./field/FieldHeader";
import { FieldOverlay } from "./field/FieldOverlay";
import { FieldVisualization } from "./field/FieldVisualization";
import { ConstellationControls } from "./field/ConstellationControls";
import { TimeBasedActionCard } from "./field/TimeBasedActionCard";
import { BannerManager } from "@/components/BannerManager";
import { EventDetailsSheet } from "@/components/EventDetailsSheet";
import { NearbyVenuesSheet } from "@/components/NearbyVenuesSheet";
import { VenueDetailsSheet } from "@/components/VenueDetailsSheet";
import { VenuesChip } from "@/components/VenuesChip";
import { useDebug } from "@/lib/useDebug";
import { useFullscreenMap } from "@/store/useFullscreenMap";
import { useSelectedVenue } from "@/store/useSelectedVenue";
import { FullscreenFab } from "@/components/map/FullscreenFab";
import { MiniMap } from "@/components/map/MiniMap";
import { ListModeContainer } from "@/components/lists/ListModeContainer";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { clsx } from "clsx";
import type { Vibe } from "@/types";
import { useStableMemo } from "@/hooks/useStableMemo";
import { useFriends } from "@/hooks/useFriends";
import { useBucketedPresence } from "@/hooks/useBucketedPresence";

// Use basic hooks for stability - restore optimized versions after baseline works
import { useGeolocation } from "@/hooks/useGeolocation";
import { useCurrentEvent } from "@/hooks/useCurrentEvent";
import { useNearbyVenues } from "@/hooks/useNearbyVenues";

interface Person {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
  vibe: string;
  isFriend?: boolean; // 6.4 - Add friend flag for UI enhancement
}

interface FloqEvent {
  id: string;
  title: string;
  x: number;
  y: number;
  size: number;
  participants: number;
  vibe: string;
}

export const FieldScreen = () => {
  const [debug] = useDebug();
  const { timeState, shouldShowModule } = useTimeSyncContext();
  const [showTimeWarp, setShowTimeWarp] = useState(false);
  const [currentTimeWarpData, setCurrentTimeWarpData] = useState<any>(null);
  const [constellationMode, setConstellationMode] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [venuesSheetOpen, setVenuesSheetOpen] = useState(false);
  const { selectedVenueId, setSelectedVenueId } = useSelectedVenue();
  
  const { mode, set } = useFullscreenMap();
  
  // Use basic hooks for stability
  const location = useGeolocation();
  const [currentVibe, setCurrentVibe] = useState<Vibe>('social');
  
  // 6.6 - Integration: Wire up friends and presence data
  const { friends: friendIds, profiles } = useFriends();
  const { people: presenceData, lastHeartbeat } = useBucketedPresence(location.lat, location.lng, friendIds);
  
  // 6.6 - Create profiles map for quick lookup
  const profilesMap = useStableMemo(() => {
    return new Map(profiles.map(p => [p.id, p]));
  }, [profiles.length, profiles.map(p => p.id).join(',')]);
  
  // Get nearby venues for chip and current event
  const { data: nearbyVenues = [] } = useNearbyVenues(location.lat, location.lng, 0.3);
  const { data: currentEvent } = useCurrentEvent(location.lat, location.lng, () => setShowBanner(false));
  
  const changeVibe = (newVibe: Vibe) => {
    setCurrentVibe(newVibe);
  };
  
  // Mock floqs data for now
  const walkable_floqs: any[] = [];
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

  // 6.6 - Convert presence data to people format with friend information
  const people: Person[] = useStableMemo(() => {
    return presenceData.map((presence) => {
      const profile = profilesMap.get(presence.user_id);
      return {
        id: presence.user_id,
        name: profile?.display_name || `User ${presence.user_id.slice(-4)}`,
        x: Math.random() * 80 + 10, // TODO: Convert lat/lng to field coordinates
        y: Math.random() * 80 + 10,
        color: getVibeColor(presence.vibe || 'social'),
        vibe: presence.vibe || 'social',
        isFriend: presence.isFriend || false, // 6.4 - Pass friend flag for UI enhancement
      };
    });
  }, [presenceData.length, profilesMap.size]);

  // 6.6 - Convert friends to extended format for constellation mode
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
        avatar_url: profilesMap.get(person.id)?.avatar_url,
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

  const handleSocialAction = (action: any) => {
    console.log('Social action triggered:', action);
    switch (action.type) {
      case 'shake-pulse':
        setConstellationMode(true);
        break;
      case 'social-radar':
        setConstellationMode(!constellationMode);
        break;
      case 'quick-join':
        break;
      case 'vibe-broadcast':
        break;
    }
  };

  const handleConstellationAction = (action: any) => {
    console.log('Constellation action:', action);
    switch (action.type) {
      case 'orbital-adjust':
        break;
      case 'constellation-create':
        break;
      case 'energy-share':
        break;
      case 'group-plan':
        break;
      case 'temporal-view':
        setShowTimeWarp(true);
        break;
    }
  };

  const handleOrbitalAdjustment = (direction: 'expand' | 'contract', intensity: number) => {
    console.log('Orbital adjustment:', direction, intensity);
  };

  const handleEnergyShare = (fromId: string, toId: string, energy: number) => {
    console.log('Energy sharing:', fromId, 'to', toId, 'energy:', energy);
  };

  const handleFriendInteraction = (friend: any, action: string) => {
    console.log('Friend interaction:', friend.name, action);
  };

  const handleConstellationGesture = (gesture: string, friends: any[]) => {
    console.log('Constellation gesture:', gesture, friends.length, 'friends');
  };

  const handleAvatarInteraction = (interaction: any) => {
    console.log('Avatar interaction:', interaction);
  };

  const handleTimeWarpChange = (hour: number, data: any) => {
    setCurrentTimeWarpData(data);
    console.log('Time warp:', hour, data);
  };

  // ESC key to exit full-screen mode
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mode === 'full') set('map')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, set])

  // URL sync
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    if (mode === 'full') params.set('full', '1')
    else params.delete('full')
    if (mode === 'list') params.set('view', 'list')
    else params.delete('view')
    window.history.replaceState(null, '', `${window.location.pathname}?${params.toString()}`)
  }, [mode])

  // Auto-exit full-screen when any sheet opens
  useEffect(() => {
    if (mode === 'full' && (detailsOpen || venuesSheetOpen || selectedVenueId)) {
      set('map')
    }
  }, [mode, detailsOpen, venuesSheetOpen, selectedVenueId, set])

  // Temporarily disable advanced gestures for baseline
  // const { handlers } = useAdvancedGestures({
  //   onSwipeDown: () => mode === 'full' && set('map'),
  // });
  const handlers = {};

  if (location.loading && !location.lat) {
    return (
      <ErrorBoundary>
        <div className="relative h-svh w-full bg-background">
          <FieldHeader locality="Locating..." />
          <div className="flex items-center justify-center h-full">
            <div className="text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
              <p className="text-muted-foreground">Getting your location...</p>
            </div>
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  return (
    <ErrorBoundary>
      <div className="relative h-svh w-full bg-background" {...handlers}>
        {/* Place-aware Banner System */}
        <BannerManager />

        {currentEvent && (
          <EventDetailsSheet
            open={detailsOpen}
            onOpenChange={setDetailsOpen}
            event={{
              ...currentEvent,
              people: people.length,
            }}
          />
        )}
        
        {/* Header */}
        <FieldHeader 
          locality={location.error ? "Location unavailable" : "Current location"}
          connectionLost={location.error !== null}
        />

        {/* Map canvas */}
        {(mode === 'map' || mode === 'full') && (
          <FieldVisualization
            className={clsx('absolute inset-0 top-12 transition-all duration-300',
              mode === 'full' && 'fullscreen-map'
            )}
            constellationMode={constellationMode}
            people={people}
            friends={friends}
            floqEvents={floqEvents}
            walkableFloqs={walkable_floqs}
            onFriendInteraction={handleFriendInteraction}
            onConstellationGesture={handleConstellationGesture}
            onAvatarInteraction={handleAvatarInteraction}
          />
        )}

        {/* Overlay system */}
        <FieldOverlay
          isLocationReady={isLocationReady}
          currentVibe={currentVibe}
          nearbyUsersCount={people.length}
          walkableFloqsCount={walkable_floqs.length}
          updating={false} // TODO: Add real updating state when presence is fully restored
          error={location.error}
          debug={debug}
          onVibeChange={(vibe) => changeVibe(vibe)}
        >
          {/* Constellation Controls */}
          <ConstellationControls
            timeState={timeState}
            constellationMode={constellationMode}
            onConstellationToggle={() => setConstellationMode(!constellationMode)}
            onConstellationAction={handleConstellationAction}
            onOrbitalAdjustment={handleOrbitalAdjustment}
            onEnergyShare={handleEnergyShare}
          />
        </FieldOverlay>

        {/* List mode container */}
        {mode === 'list' && <ListModeContainer />}

        {/* Mini-map overlay (list mode only) */}
        {mode === 'list' && (
          <MiniMap
            constellationMode={constellationMode}
            people={people}
            friends={friends}
            floqEvents={floqEvents}
            walkableFloqs={walkable_floqs}
            onFriendInteraction={handleFriendInteraction}
            onConstellationGesture={handleConstellationGesture}
            onAvatarInteraction={handleAvatarInteraction}
          />
        )}

        {/* Social Gesture Manager */}
        <SocialGestureManager onSocialAction={handleSocialAction} />

        {/* Time Warp Slider */}
        <TimeWarpSlider 
          isVisible={showTimeWarp}
          onClose={() => setShowTimeWarp(false)}
          onTimeChange={handleTimeWarpChange}
        />

        {/* Time-Based Bottom Action Card */}
        <div 
          className="absolute bottom-24 left-4 right-4"
          style={{ zIndex: 40 }}
        >
          <TimeBasedActionCard
            timeState={timeState}
            onTimeWarpToggle={() => setShowTimeWarp(true)}
          />
        </div>

        {/* Swipeable Venues Chip */}
        {nearbyVenues.length > 0 && !currentEvent && (
          <VenuesChip
            onOpen={() => setVenuesSheetOpen(true)}
            venueCount={nearbyVenues.length}
          />
        )}

        {/* Nearby Venues Sheet */}
        <NearbyVenuesSheet
          isOpen={venuesSheetOpen}
          onClose={() => setVenuesSheetOpen(false)}
          onVenueTap={(venueId) => {
            setSelectedVenueId(venueId);
            setVenuesSheetOpen(false);
            if ('vibrate' in navigator) {
              navigator.vibrate(4);
            }
          }}
        />

        {/* Venue Details Sheet */}
        <VenueDetailsSheet
          open={!!selectedVenueId}
          onOpenChange={(open) => !open && setSelectedVenueId(null)}
          venueId={selectedVenueId}
        />

        {/* Full-screen toggle FAB */}
        <FullscreenFab />
      </div>
    </ErrorBoundary>
  );
};