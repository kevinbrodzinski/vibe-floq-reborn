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
import { EventBanner } from "@/components/EventBanner";
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
import { LayersPortal } from "@/components/ui/layers-portal";
import { clsx } from "clsx";
import type { Vibe } from "@/types";
import { Z } from "@/lib/z-index";
import { useStableMemo } from "@/hooks/useStableMemo";

// Use the optimized hooks for better performance
import { useOptimizedGeolocation } from "@/hooks/useOptimizedGeolocation";
import { useOptimizedPresence } from "@/hooks/useOptimizedPresence";
import { useCurrentEvent } from "@/hooks/useCurrentEvent";
import { useNearbyVenues } from "@/hooks/useNearbyVenues";
import { useAdvancedGestures } from "@/hooks/useAdvancedGestures";

interface Person {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
  vibe: string;
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
  
  // Use optimized hooks for better performance
  const location = useOptimizedGeolocation();
  const [currentVibe, setCurrentVibe] = useState<Vibe>('social');
  
  // Use optimized presence hook instead of separate hooks
  const presenceData = useOptimizedPresence({
    vibe: currentVibe,
    lat: location.lat,
    lng: location.lng,
    enabled: !location.loading && !location.error
  });
  
  const { data: currentEvent } = useCurrentEvent(
    location.lat,
    location.lng,
    () => setShowBanner(false)
  );
  
  // Get nearby venues for chip
  const nearbyVenues = useNearbyVenues(location.lat, location.lng, 0.3);
  
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

  // Memoize heavy array transformations with stable keys to prevent re-renders
  const people: Person[] = useStableMemo(() => 
    presenceData.people.map((user, index) => ({
      id: user.user_id,
      name: `User ${index + 1}`, // Could be enhanced with profiles
      x: 20 + (index * 15) % 60, // Distribute across field
      y: 20 + (index * 20) % 60,
      color: getVibeColor(user.vibe || 'chill'),
      vibe: user.vibe || 'chill',
    })), [presenceData.people]
  );

  // Memoize friends array to prevent constellation re-renders
  const friends = useStableMemo(() => 
    people.map((person, index) => ({
      ...person,
      relationship: (index % 3 === 0 ? 'close' : index % 2 === 0 ? 'friend' : 'acquaintance') as 'close' | 'friend' | 'acquaintance',
      activity: 'active' as const,
      warmth: 60 + Math.random() * 40,
      compatibility: 70 + Math.random() * 30,
      lastSeen: Date.now() - Math.random() * 900000,
    })), [people]
  );

  // Memoize floq events transformation
  const floqEvents: FloqEvent[] = useStableMemo(() => 
    walkable_floqs.map((floq, index) => ({
      id: floq.id,
      title: floq.title,
      x: 30 + (index * 25) % 50,
      y: 40 + (index * 20) % 40,
      size: Math.min(Math.max(40 + floq.participant_count * 8, 40), 100),
      participants: floq.participant_count,
      vibe: floq.primary_vibe,
    })), [walkable_floqs]
  );

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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (mode === 'full' && (detailsOpen || venuesSheetOpen || selectedVenueId)) {
      set('map')
    }
  }, [mode, detailsOpen, venuesSheetOpen, selectedVenueId]) // Removed 'set' to prevent loops

  // Swipe-down gesture to exit full-screen
  const { handlers } = useAdvancedGestures({
    onSwipeDown: () => mode === 'full' && set('map'),
  });

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

  return (
    <ErrorBoundary>
      <div className="relative h-svh w-full bg-background" {...handlers}>
        {/* Event Banner and Sheets moved to portal for proper layering */}
        <LayersPortal>
          {currentEvent && showBanner && (
            <div style={{ zIndex: Z.banner }}>
              <EventBanner
                key={currentEvent.id}
                eventId={currentEvent.id}
                name={currentEvent.name}
                vibe={currentEvent.vibe}
                liveCount={undefined}
                aiSummary={undefined}
                onDetails={() => setDetailsOpen(true)}
                onDismiss={() => setShowBanner(false)}
              />
            </div>
          )}

          {currentEvent && (
            <div style={{ zIndex: Z.sheet }}>
              <EventDetailsSheet
                open={detailsOpen}
                onOpenChange={setDetailsOpen}
                event={{
                  ...currentEvent,
                  people: people.length,
                }}
              />
            </div>
          )}
        </LayersPortal>
        
        {/* Header */}
        <FieldHeader 
          locationReady={isLocationReady} 
          currentLocation={location.error ? "Location unavailable" : "Current location"}
        />

        {/* Map canvas with proper z-index and constellation dimming */}
        {(mode === 'map' || mode === 'full') && (
          <div 
            className="absolute inset-0 top-12" 
            style={{ 
              zIndex: Z.map,
              pointerEvents: 'auto',
              filter: constellationMode ? 'brightness(0.3)' : 'none'
            }}
          >
            <FieldVisualization
              className={clsx('transition-all duration-300',
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
          </div>
        )}

        {/* Overlay system */}
        <FieldOverlay
          isLocationReady={isLocationReady}
          currentVibe={currentVibe}
          nearbyUsersCount={people.length}
          walkableFloqsCount={walkable_floqs.length}
          updating={presenceData.updating}
          error={location.error}
          debug={debug}
          onVibeChange={changeVibe}
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

        {/* List mode container with proper z-index */}
        {mode === 'list' && (
          <div style={{ zIndex: Z.sheet }}>
            <ListModeContainer />
          </div>
        )}

        {/* Mini-map overlay (list mode only) with proper z-index */}
        {mode === 'list' && (
          <div style={{ zIndex: Z.miniMap }}>
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
          </div>
        )}

        {/* Social Gesture Manager */}
        <SocialGestureManager onSocialAction={handleSocialAction} />

        {/* Time Warp Slider */}
        <TimeWarpSlider 
          isVisible={showTimeWarp}
          onClose={() => setShowTimeWarp(false)}
          onTimeChange={handleTimeWarpChange}
        />

        {/* Time-Based Bottom Action Card with safe area positioning */}
        <div 
          className="fixed bottom-0 left-4 right-4 pb-safe"
          style={{ zIndex: Z.banner }}
        >
          <div className="pb-24"> {/* Space for bottom nav */}
            <TimeBasedActionCard
              timeState={timeState}
              onTimeWarpToggle={() => setShowTimeWarp(true)}
            />
          </div>
        </div>

        {/* Swipeable Venues Chip */}
        {(nearbyVenues.data?.length || 0) > 0 && !currentEvent && (
          <VenuesChip
            onClick={() => setVenuesSheetOpen(true)}
            venueCount={nearbyVenues.data?.length || 0}
          />
        )}

        {/* Venue Sheets moved to portal for proper layering */}
        <LayersPortal>
          <div style={{ zIndex: Z.sheet }}>
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

            <VenueDetailsSheet
              open={!!selectedVenueId}
              onOpenChange={(open) => !open && setSelectedVenueId(null)}
              venueId={selectedVenueId}
            />
          </div>
        </LayersPortal>

        {/* Contextual FAB - only show full-screen toggle when not in list mode */}
        {mode !== 'list' && <FullscreenFab />}
      </div>
    </ErrorBoundary>
  );
};