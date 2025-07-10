import { useState, useCallback, useMemo, useEffect } from 'react';
import { FieldVisualization } from './field/FieldVisualization';
import { FieldOverlay } from './field/FieldOverlay';
import { FieldHeader } from './field/FieldHeader';
import { ConstellationControls } from './field/ConstellationControls';
import { TimeBasedActionCard } from './field/TimeBasedActionCard';
import { EventBanner } from '@/components/EventBanner';
import { EventDetailsSheet } from '@/components/EventDetailsSheet';
import { NearbyVenuesSheet } from '@/components/NearbyVenuesSheet';
import { VenueDetailsSheet } from '@/components/VenueDetailsSheet';
import { VenuesChip } from '@/components/VenuesChip';
import { SocialGestureManager } from '@/components/SocialGestureManager';
import { MiniMap } from '@/components/map/MiniMap';
import { ListModeContainer } from '@/components/lists/ListModeContainer';
import { TimeWarpSlider } from '@/components/TimeWarpSlider';
import { ErrorBoundary } from '@/components/ui/error-boundary';
import { FieldSkeleton } from '@/components/ui/skeleton-loader';
import { useOptimizedGeolocation } from '@/hooks/useOptimizedGeolocation';
import { useCurrentEvent } from '@/hooks/useCurrentEvent';
import { useOptimizedPresence } from '@/hooks/useOptimizedPresence';
import { useNearbyVenues } from '@/hooks/useNearbyVenues';
import { useFieldState } from '@/hooks/useFieldState';
import { useFullscreenMap } from '@/store/useFullscreenMap';
import type { Vibe } from '@/types';
import { setDocumentTitle } from '@/utils/setDocumentTitle';

// Data interfaces
interface Person {
  id: string;
  lat: number;
  lng: number;
  vibe: Vibe;
  avatar: string;
  name: string;
  displayName: string;
  distance: number;
}

interface FloqEvent {
  id: string;
  title: string;
  lat: number;
  lng: number;
  size: number;
  participants: number;
  vibe: Vibe;
  startsAt: string;
}

export const FieldScreen = () => {
  // Centralized state management
  const [fieldState, fieldActions] = useFieldState();
  const { mode } = useFullscreenMap();
  const mini = mode === 'map';

  // Optimized data hooks
  const location = useOptimizedGeolocation();
  const currentEvent = useCurrentEvent(location.lat, location.lng);
  const presenceData = useOptimizedPresence({
    vibe: fieldState.currentVibe,
    lat: location.lat,
    lng: location.lng,
    enabled: !location.loading && !location.error
  });
  const venues = useNearbyVenues(location.lat || 0, location.lng || 0);

  // Set loading state based on location
  useEffect(() => {
    fieldActions.setLoading(location.loading);
    fieldActions.setError(location.error);
  }, [location.loading, location.error, fieldActions]);

  // Transform nearby users into people format
  const transformedPeople = useMemo(() => {
    if (!presenceData.people || presenceData.people.length === 0) return [];
    
    return presenceData.people.map((person: any, index: number) => ({
      id: person.user_id,
      x: 20 + (index * 15) % 60,
      y: 20 + (index * 20) % 60,
      lat: person.lat || (person.location ? person.location.coordinates[1] : 0),
      lng: person.lng || (person.location ? person.location.coordinates[0] : 0),
      vibe: person.vibe || 'chill',
      color: 'hsl(240 70% 60%)',
      avatar: '',
      name: person.user_id,
      displayName: person.display_name || person.user_id,
      distance: person.distance_meters || 0,
    }));
  }, [presenceData.people]);

  // Convert walkable floqs to floq events format
  const floqEvents = useMemo<FloqEvent[]>(() => {
    // Mock data for now - will be replaced with real floq data
    return [];
  }, []);

  // Event handlers with optimized callbacks
  const changeVibe = useCallback((newVibe: Vibe) => {
    fieldActions.changeVibe(newVibe);
    // Presence will be updated automatically by useOptimizedPresence
  }, [fieldActions]);

  const handleSocialAction = useCallback((action: string, targetId: string) => {
    console.log('Social action:', action, 'for user:', targetId);
  }, []);

  const handleConstellationAction = useCallback((action: any) => {
    console.log('Constellation action:', action);
  }, []);

  const handleOrbitalAdjustment = useCallback((direction: 'expand' | 'contract', intensity: number) => {
    console.log('Orbital adjustment:', direction, intensity);
  }, []);

  const handleEnergyShare = useCallback((fromId: string, toId: string, energy: number) => {
    console.log('Energy share:', fromId, '->', toId, energy);
  }, []);

  const handleFriendInteraction = useCallback((friend: any, action: string) => {
    if (action === 'dm') {
      fieldActions.openDMSheet(friend);
    }
  }, [fieldActions]);

  const handleConstellationGesture = useCallback((gesture: any) => {
    console.log('Constellation gesture:', gesture);
  }, []);

  const handleAvatarInteraction = useCallback((person: any, action: string) => {
    console.log('Avatar interaction:', person, action);
  }, []);

  // Set document title
  setDocumentTitle('Field');

  const timeState = 'day'; // Simplified for now

  // Show loading skeleton if still loading location
  if (fieldState.isLoading && !location.lat) {
    return (
      <div className="relative w-full h-screen bg-background overflow-hidden">
        <FieldHeader locationReady={false} />
        <FieldSkeleton />
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="relative w-full h-screen bg-background overflow-hidden">
        <FieldHeader 
          locationReady={!location.loading}
          currentLocation={location.error ? "Location unavailable" : "Current location"}
        />
        
        <FieldVisualization
          people={transformedPeople}
          events={floqEvents}
          friends={[]}
          constellationMode={fieldState.constellationMode}
          onSocialAction={handleSocialAction}
          onFriendInteraction={handleFriendInteraction}
          onConstellationGesture={handleConstellationGesture}
          onAvatarInteraction={handleAvatarInteraction}
          viewport={fieldState.viewport}
          onViewportChange={fieldActions.setViewport}
          mini={mini}
        />

        <FieldOverlay
          isLocationReady={!location.loading}
          currentVibe={fieldState.currentVibe}
          nearbyUsersCount={transformedPeople.length}
          walkableFloqsCount={floqEvents.length}
          updating={presenceData.updating}
          error={location.error}
          debug={false}
          onVibeChange={changeVibe}
        >
          <ConstellationControls
            timeState={timeState}
            constellationMode={fieldState.constellationMode}
            onConstellationToggle={fieldActions.toggleConstellationMode}
            onConstellationAction={handleConstellationAction}
            onOrbitalAdjustment={handleOrbitalAdjustment}
            onEnergyShare={handleEnergyShare}
          />

          <TimeBasedActionCard
            timeState={timeState}
            currentVibe={fieldState.currentVibe}
            nearbyCount={transformedPeople.length}
            onVibeChange={changeVibe}
          />

          <VenuesChip
            venueCount={venues?.length || 0}
            onOpenVenues={fieldActions.openNearbyVenues}
          />
        </FieldOverlay>

        <SocialGestureManager
          people={transformedPeople}
          onSocialAction={handleSocialAction}
        />

        {/* Mini Map */}
        <MiniMap
          center={location.lat && location.lng ? { lat: location.lat, lng: location.lng } : null}
          people={transformedPeople}
          venues={venues || []}
          events={floqEvents}
          radius={500}
          className="absolute bottom-4 left-4 z-20"
        />

        {/* List Mode Container */}
        <ListModeContainer
          people={transformedPeople}
          venues={venues || []}
          events={floqEvents}
          onItemSelect={(item) => {
            if (item.type === 'venue') {
              fieldActions.openVenueDetails(item);
            } else if (item.type === 'event') {
              fieldActions.openEventDetails(item);
            }
          }}
        />

        {/* Time Warp Controls */}
        <TimeWarpSlider
          enabled={fieldState.timeWarpEnabled}
          onToggle={fieldActions.toggleTimeWarp}
          className="absolute bottom-20 left-1/2 transform -translate-x-1/2 z-20"
        />

        {/* Event Banner */}
        {currentEvent && (
          <EventBanner
            event={currentEvent}
            onViewDetails={() => fieldActions.openEventDetails(currentEvent)}
          />
        )}

        {/* Sheets */}
        <EventDetailsSheet
          event={fieldState.selectedEvent}
          open={fieldState.eventDetailsSheetOpen}
          onOpenChange={fieldActions.closeEventDetails}
        />

        <NearbyVenuesSheet
          venues={venues || []}
          open={fieldState.nearbyVenuesSheetOpen}
          onOpenChange={fieldActions.closeNearbyVenues}
          onVenueSelect={(venue) => {
            fieldActions.openVenueDetails(venue);
            fieldActions.closeNearbyVenues();
          }}
        />

        <VenueDetailsSheet
          venue={fieldState.selectedVenue}
          open={fieldState.venueDetailsSheetOpen}
          onOpenChange={fieldActions.closeVenueDetails}
        />
      </div>
    </ErrorBoundary>
  );
};