import { useState } from "react";
import { TimeStatusIndicator } from "@/components/TimeStatusIndicator";
import { useTimeSyncContext } from "@/components/TimeSyncProvider";
import { TimeWarpSlider } from "@/components/TimeWarpSlider";
import { SocialGestureManager } from "@/components/SocialGestureManager";
import { FieldHeader } from "./field/FieldHeader";
import { FieldOverlay } from "./field/FieldOverlay";
import { TimeModuleIndicators } from "./field/TimeModuleIndicators";
import { FieldVisualization } from "./field/FieldVisualization";
import { ConstellationControls } from "./field/ConstellationControls";
import { TimeBasedActionCard } from "./field/TimeBasedActionCard";
import { usePresence } from "@/hooks/usePresence";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useBucketedPresence } from "@/hooks/useBucketedPresence";
import { useCurrentEvent } from "@/hooks/useCurrentEvent";
import { useNearbyVenues } from "@/hooks/useNearbyVenues";
import { useAdvancedGestures } from "@/hooks/useAdvancedGestures";
import { EventBanner } from "@/components/EventBanner";
import { EventDetailsSheet } from "@/components/EventDetailsSheet";
import { NearbyVenuesSheet } from "@/components/NearbyVenuesSheet";
import { VenueDetailsSheet } from "@/components/VenueDetailsSheet";
import { VenuesChip } from "@/components/VenuesChip";
import { Badge } from "@/components/ui/badge";
import { useDebug } from "@/lib/useDebug";
import { useFullscreenMap } from "@/store/useFullscreenMap";
import { useSelectedVenue } from "@/store/useSelectedVenue";
import { FullscreenFab } from "@/components/map/FullscreenFab";
import { MiniMap } from "@/components/map/MiniMap";
import { ListModeContainer } from "@/components/lists/ListModeContainer";
import { useEffect } from "react";
import { clsx } from "clsx";
import type { Vibe } from "@/types";

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
  
  // Use enhanced presence hook for live data
  const location = useGeolocation();
  const [currentVibe, setCurrentVibe] = useState<Vibe>('social');
  
  // Use the bulletproof presence hook for sending
  usePresence(currentVibe, location.lat, location.lng);
  
  // Use the bucketed presence hook for receiving
  const { people: nearby_users } = useBucketedPresence(location.lat, location.lng);
  const updating = false; // No loading state needed with realtime
  const error = null; // Error handling is done in the hook
  
const { currentEvent } = useCurrentEvent(location.lat, location.lng, () => setShowBanner(false));
  
  // Get nearby venues for chip
  const { data: nearbyVenues = [] } = useNearbyVenues(location.lat, location.lng, 0.3);
  
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

  // Convert nearby users to people format for existing visualization
  const people: Person[] = nearby_users.map((user, index) => ({
    id: user.user_id,
    name: `User ${index + 1}`, // Could be enhanced with profiles
    x: 20 + (index * 15) % 60, // Distribute across field
    y: 20 + (index * 20) % 60,
    color: getVibeColor(user.vibe || 'chill'),
    vibe: user.vibe || 'chill',
  }));

  // Convert people to friends for constellation system
  const friends = people.map((person, index) => ({
    ...person,
    relationship: (index % 3 === 0 ? 'close' : index % 2 === 0 ? 'friend' : 'acquaintance') as 'close' | 'friend' | 'acquaintance',
    activity: 'active' as const,
    warmth: 60 + Math.random() * 40,
    compatibility: 70 + Math.random() * 30,
    lastSeen: Date.now() - Math.random() * 900000,
  }));

  // Convert walkable floqs to floq events format
  const floqEvents: FloqEvent[] = walkable_floqs.map((floq, index) => ({
    id: floq.id,
    title: floq.title,
    x: 30 + (index * 25) % 50,
    y: 40 + (index * 20) % 40,
    size: Math.min(Math.max(40 + floq.participant_count * 8, 40), 100),
    participants: floq.participant_count,
    vibe: floq.primary_vibe,
  }));

  // Moved to TimeBasedActionCard component

  const handleSocialAction = (action: any) => {
    console.log('Social action triggered:', action);
    // Handle various social actions from gestures
    switch (action.type) {
      case 'shake-pulse':
        // Show active friends with pulse effect
        setConstellationMode(true);
        break;
      case 'social-radar':
        // Show social connections
        setConstellationMode(!constellationMode);
        break;
      case 'quick-join':
        // Find and join nearby floqs
        break;
      case 'vibe-broadcast':
        // Broadcast current vibe
        break;
    }
  };

  const handleConstellationAction = (action: any) => {
    console.log('Constellation action:', action);
    switch (action.type) {
      case 'orbital-adjust':
        // Handle orbital adjustments
        break;
      case 'constellation-create':
        // Create new constellation group
        break;
      case 'energy-share':
        // Share energy between friends
        break;
      case 'group-plan':
        // Start group planning mode
        break;
      case 'temporal-view':
        setShowTimeWarp(true);
        break;
    }
  };

  const handleOrbitalAdjustment = (direction: 'expand' | 'contract', intensity: number) => {
    console.log('Orbital adjustment:', direction, intensity);
    // Handle orbital distance changes
  };

  const handleEnergyShare = (fromId: string, toId: string, energy: number) => {
    console.log('Energy sharing:', fromId, 'to', toId, 'energy:', energy);
    // Handle energy sharing between friends
  };

  const handleFriendInteraction = (friend: any, action: string) => {
    console.log('Friend interaction:', friend.name, action);
    // Handle friend-specific interactions
  };

  const handleConstellationGesture = (gesture: string, friends: any[]) => {
    console.log('Constellation gesture:', gesture, friends.length, 'friends');
    // Handle constellation-level gestures
  };

  const handleAvatarInteraction = (interaction: any) => {
    console.log('Avatar interaction:', interaction);
    // Handle avatar-to-avatar interactions
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

  // Swipe-down gesture to exit full-screen
  const gestureHandlers = useAdvancedGestures({
    onSwipeDown: () => mode === 'full' && set('map'),
  });

  return (
    <div className="relative h-svh w-full bg-background" {...gestureHandlers}>
      {/* Event Banner */}
      {currentEvent && showBanner && (
        <EventBanner
          key={currentEvent.id}
          eventId={currentEvent.id}
          name={currentEvent.name}
          vibe={currentEvent.vibe}
          liveCount={undefined} // TODO: Add live count from SQL
          aiSummary={undefined} // TODO: Add AI summary
          onDetails={() => setDetailsOpen(true)}
          onDismiss={() => setShowBanner(false)}
        />
      )}

      {currentEvent && (
        <EventDetailsSheet
          open={detailsOpen}
          onOpenChange={setDetailsOpen}
          event={{
            ...currentEvent,
            people: walkable_floqs.length,   // placeholder
          }}
        />
      )}
      
      {/* Header */}
      <FieldHeader />

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
        nearbyUsersCount={nearby_users.length}
        walkableFloqsCount={walkable_floqs.length}
        updating={updating}
        error={error}
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

      {/* Time-Based Module Indicators */}
      <TimeModuleIndicators />

      {/* Social Gesture Manager */}
      <SocialGestureManager onSocialAction={handleSocialAction} />

      {/* Time Warp Slider */}
      <TimeWarpSlider 
        isVisible={showTimeWarp}
        onClose={() => setShowTimeWarp(false)}
        onTimeChange={handleTimeWarpChange}
      />

      {/* Time-Based Bottom Action Card */}
      <div className="absolute bottom-24 left-4 right-4 z-10">
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
          // Add subtle haptic feedback
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
  );
};