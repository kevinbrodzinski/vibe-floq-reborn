import { useState } from "react";
import { TimeStatusIndicator } from "@/components/TimeStatusIndicator";
import { useTimeSyncContext } from "@/components/TimeSyncProvider";
import { TimeWarpSlider } from "@/components/TimeWarpSlider";
import { SocialGestureManager } from "@/components/SocialGestureManager";
import { FieldHeader } from "./field/FieldHeader";
import { TimeModuleIndicators } from "./field/TimeModuleIndicators";
import { FieldVisualization } from "./field/FieldVisualization";
import { ConstellationControls } from "./field/ConstellationControls";
import { TimeBasedActionCard } from "./field/TimeBasedActionCard";
import { usePresence } from "@/hooks/usePresence";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useNearbyPresence } from "@/hooks/useNearbyPresence";
import { useCurrentEvent } from "@/hooks/useCurrentEvent";
import { useNearbyVenues } from "@/hooks/useNearbyVenues";
import { useAdvancedGestures } from "@/hooks/useAdvancedGestures";
import { EventBanner } from "@/components/EventBanner";
import { EventDetailsSheet } from "@/components/EventDetailsSheet";
import { NearbyVenuesSheet } from "@/components/NearbyVenuesSheet";
import { VenueDetailsSheet } from "@/components/VenueDetailsSheet";
import { Badge } from "@/components/ui/badge";
import { useDebug } from "@/lib/useDebug";
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
  const [selectedVenueId, setSelectedVenueId] = useState<string | null>(null);
  
  // Use enhanced presence hook for live data
  const location = useGeolocation();
  const [currentVibe, setCurrentVibe] = useState<Vibe>('social');
  
  // Use the bulletproof presence hook for sending
  usePresence(currentVibe, location.lat, location.lng);
  
  // Use the nearby presence hook for receiving
  const { nearby: nearby_users, loading: updating, error } = useNearbyPresence(
    location.lat, 
    location.lng, 
    { km: 1 }
  );
  
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
    color: getVibeColor(user.vibe),
    vibe: user.vibe,
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

  return (
    <div className="relative h-screen overflow-hidden">
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
      
      {/* Debug counter */}
      {debug && (
        <div className="absolute top-2 right-2 z-30 text-xs opacity-60 bg-black/20 px-2 py-1 rounded">
          {nearby_users.length} people • {walkable_floqs.length} floqs ≤ 1 km
        </div>
      )}
      
      {/* Header */}
      <FieldHeader />

      {/* Live Presence Status */}
      <div className="absolute top-20 left-4 z-20">
        <div className="bg-card/90 backdrop-blur-sm border border-border/30 rounded-lg p-3">
          <div className="flex items-center gap-2 mb-2">
            <div className={`w-2 h-2 rounded-full ${isLocationReady ? 'bg-green-500' : 'bg-red-500'}`} />
            <span className="text-sm font-medium">
              {isLocationReady ? 'Location Active' : 'Getting Location...'}
            </span>
          </div>
          {currentVibe && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">Vibe:</span>
              <Badge 
                variant="outline" 
                className="text-xs cursor-pointer hover:bg-primary/10"
                onClick={() => {
                  const vibes: Vibe[] = ['social', 'chill', 'hype', 'flowing', 'open'];
                  const currentIndex = vibes.indexOf(currentVibe);
                  const nextVibe = vibes[(currentIndex + 1) % vibes.length];
                  changeVibe(nextVibe);
                }}
              >
                {currentVibe}
              </Badge>
            </div>
          )}
          <div className="text-xs text-muted-foreground mt-1">
            {nearby_users.length} nearby • {walkable_floqs.length} floqs
          </div>
          {updating && <div className="text-xs text-primary animate-pulse">Updating...</div>}
          {error && <div className="text-xs text-destructive">{error}</div>}
        </div>
      </div>

      {/* Time-Synced Status Bar */}
      <div className="absolute top-24 left-0 right-0 z-10 text-center pt-4">
        <TimeStatusIndicator />
      </div>

      {/* Time-Based Module Indicators */}
      <TimeModuleIndicators />

      {/* Field Map */}
      <FieldVisualization
        constellationMode={constellationMode}
        people={people}
        friends={friends}
        floqEvents={floqEvents}
        walkableFloqs={walkable_floqs}
        onFriendInteraction={handleFriendInteraction}
        onConstellationGesture={handleConstellationGesture}
        onAvatarInteraction={handleAvatarInteraction}
      />

      {/* Social Gesture Manager */}
      <SocialGestureManager onSocialAction={handleSocialAction} />

      {/* Constellation Controls */}
      <ConstellationControls
        timeState={timeState}
        constellationMode={constellationMode}
        onConstellationToggle={() => setConstellationMode(!constellationMode)}
        onConstellationAction={handleConstellationAction}
        onOrbitalAdjustment={handleOrbitalAdjustment}
        onEnergyShare={handleEnergyShare}
      />

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
        <div
          className="fixed bottom-4 left-1/2 -translate-x-1/2 z-20"
          {...useAdvancedGestures({
            onSwipeUp: () => setVenuesSheetOpen(true),
            onTap: () => setVenuesSheetOpen(true),
          })}
        >
          <button
            className="bg-accent text-accent-foreground px-4 py-2 
                       rounded-full text-sm font-medium shadow-lg 
                       hover:bg-accent/90 transition-all duration-200
                       active:scale-95 touch-none"
          >
            {nearbyVenues.length} venue{nearbyVenues.length > 1 ? 's' : ''} nearby ↑
          </button>
        </div>
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
    </div>
  );
};