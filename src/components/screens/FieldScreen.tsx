import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
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
import { ResizableVenuesSheet } from "@/components/ResizableVenuesSheet";
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

// Use enhanced geolocation hook with user gesture requirement
import { useOptimizedGeolocation } from "@/hooks/useOptimizedGeolocation";
import { GeolocationPrompt } from "@/components/ui/geolocation-prompt";
import { useCurrentEvent } from "@/hooks/useCurrentEvent";
import { useNearbyVenues } from "@/hooks/useNearbyVenues";
import { useActiveFloqs } from "@/hooks/useActiveFloqs";

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
  
  const { mode, setMode } = useFullscreenMap();
  
  // Use enhanced geolocation hook
  const location = useOptimizedGeolocation();
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

  // 6.6 - Convert presence data to people format with proper field coordinates
  const people: Person[] = useStableMemo(() => {
    if (!location.lat || !location.lng) return [];
    
    console.log(`🗺️ [FIELD_COORDS] Converting presence to field coordinates:`, {
      user_location: { lat: location.lat, lng: location.lng },
      presence_count: presenceData.length,
      sample_presence: presenceData.slice(0, 2).map(p => ({ 
        user_id: p.user_id, 
        lat: p.lat, 
        lng: p.lng 
      }))
    });
    
    return presenceData.map((presence) => {
      const profile = profilesMap.get(presence.user_id);
      
      // Convert lat/lng to field coordinates based on geographic distance from user
      const latDiff = presence.lat - location.lat; // Degrees north/south
      const lngDiff = presence.lng - location.lng; // Degrees east/west
      
      // Convert to field coordinates: ~111km per degree lat, ~111km * cos(lat) per degree lng
      const xMeters = lngDiff * 111320 * Math.cos((location.lat * Math.PI) / 180);
      const yMeters = latDiff * 111320;
      
      // Scale to field coordinates (field is 0-100%, assuming 2km view radius)
      const scale = 50; // 50% field width per km
      const x = Math.min(Math.max((xMeters / 1000) * scale + 50, 5), 95); // Center at 50%, clamp to 5-95%
      const y = Math.min(Math.max(-(yMeters / 1000) * scale + 50, 5), 95); // Center at 50%, negative Y (screen coords)
      
      console.log(`📍 [COORD_TRANSFORM] ${presence.user_id}:`, {
        original: { lat: presence.lat, lng: presence.lng },
        deltas: { latDiff, lngDiff },
        meters: { x: xMeters, y: yMeters },
        field_percent: { x, y }
      });
      
      return {
        id: presence.user_id,
        name: (profile as any)?.display_name || `User ${presence.user_id.slice(-4)}`,
        x,
        y,
        color: getVibeColor(presence.vibe || 'social'),
        vibe: presence.vibe || 'social',
        isFriend: presence.isFriend || false, // 6.4 - Pass friend flag for UI enhancement
      };
    });
  }, [presenceData, profilesMap, location.lat, location.lng]);

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

  const handleSocialAction = (action: any) => {
    // Social action triggered
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
    // Constellation action handled
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
    // Orbital adjustment handled
  };

  const handleEnergyShare = (fromId: string, toId: string, energy: number) => {
    // Energy sharing handled
  };

  const handleFriendInteraction = (friend: any, action: string) => {
    // Friend interaction handled
  };

  const handleConstellationGesture = (gesture: string, friends: any[]) => {
    // Constellation gesture handled
  };

  const handleAvatarInteraction = (interaction: any) => {
    // Avatar interaction handled
  };

  const handleTimeWarpChange = (hour: number, data: any) => {
    setCurrentTimeWarpData(data);
    // Time warp data updated
  };

  // ESC key to exit full-screen mode
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mode === 'full') setMode('map')
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [mode, setMode])

  // Haptic feedback on mode change
  useEffect(() => {
    if ('vibrate' in navigator) {
      navigator.vibrate(mode === 'full' ? 20 : 10)
    }
  }, [mode])

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
      setMode('map')
    }
  }, [mode, detailsOpen, venuesSheetOpen, selectedVenueId, setMode])

  // Temporarily disable advanced gestures for baseline
  // const { handlers } = useAdvancedGestures({
  //   onSwipeDown: () => mode === 'full' && set('map'),
  // });
  const handlers = {};

  // Show geolocation prompt if no location and not loading, or if there's an error
  if ((!location.lat && !location.loading) || location.error) {
    const requestLocation = () => {
      // For optimized geolocation, we trigger a reload to restart the process
      window.location.reload();
    };

    return (
      <ErrorBoundary>
        <div className="relative h-svh w-full bg-background">
          <FieldHeader locationReady={false} />
          <div className="flex items-center justify-center h-full p-4">
            <GeolocationPrompt 
              onRequestLocation={requestLocation} 
              error={location.error}
              loading={location.loading}
            />
          </div>
        </div>
      </ErrorBoundary>
    );
  }

  // Show loading state
  if (location.loading && !location.lat) {
    return (
      <ErrorBoundary>
        <div className="relative h-svh w-full bg-background">
          <FieldHeader locationReady={false} />
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

  const isFull = mode === 'full'
  const isList = mode === 'list'

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
        
        {/* Map canvas with layout controller */}
        <motion.div
          key="map-container"
          className={clsx(
            "absolute inset-0",
            isFull ? "z-50 inset-0" : "top-12",
            isList ? "z-30" : ""
          )}
          initial={false}
          animate={{
            y: isFull ? 0 : isList ? 0 : 0,
            height: isFull ? '100vh' : isList ? '35vh' : '100%'
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 35 }}
          style={{
            paddingBottom: isFull ? 'env(safe-area-inset-bottom)' : 0
          }}
        >
          {(mode === 'map' || mode === 'full') && (
            <FieldVisualization
              className={clsx('absolute inset-0', isFull && 'fullscreen-map')}
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
        </motion.div>

        {/* List mode container */}
        <AnimatePresence>
          {isList && (
            <motion.div
              key="list-container"
              className="fixed inset-x-0 bottom-[var(--mobile-nav-height)] z-40 bg-background/90 backdrop-blur"
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              style={{ height: '65vh' }}
            >
              <ListModeContainer />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Header - hidden in full mode */}
        <motion.div
          className="absolute top-0 left-0 right-0 z-50"
          animate={{
            y: isFull ? '-100%' : 0,
            opacity: isFull ? 0 : 1
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 35 }}
        >
          <FieldHeader 
            locationReady={isLocationReady} 
            currentLocation={location.error ? "Location unavailable" : "Current location"}
            lastHeartbeat={lastHeartbeat}
          />
        </motion.div>

        {/* Overlay system - hidden in full mode */}
        <motion.div
          className="absolute inset-0 top-12 pointer-events-none"
          animate={{
            opacity: isFull ? 0 : 1
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 35 }}
          style={{
            pointerEvents: isFull ? 'none' : 'auto'
          }}
        >
          <FieldOverlay
            isLocationReady={isLocationReady}
            currentVibe={currentVibe}
            nearbyUsersCount={people.length}
            walkableFloqsCount={walkable_floqs.length}
            updating={false}
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
        </motion.div>

        {/* Mini-map overlay (list mode only) */}
        {isList && (
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

        {/* Main UI chrome - hidden in full mode */}
        <motion.div
          className="absolute inset-0"
          animate={{
            y: isFull ? '100%' : 0,
            opacity: isFull ? 0 : 1
          }}
          transition={{ type: 'spring', stiffness: 300, damping: 35 }}
          style={{
            pointerEvents: isFull ? 'none' : 'auto'
          }}
        >
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
            className="absolute bottom-24 left-4 right-4 z-10"
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

          {/* Resizable Venues Sheet */}
          <ResizableVenuesSheet
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
        </motion.div>

        {/* Full-screen toggle FAB - always on top */}
        <div className="absolute inset-0 z-[60] pointer-events-none">
          <div className="pointer-events-auto">
            <FullscreenFab />
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
};