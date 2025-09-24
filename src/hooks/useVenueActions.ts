import { useCallback } from 'react';
import { openNativeMaps } from '@/utils/nativeNavigation';
import { useVenueInteractions } from '@/hooks/useVenueInteractions';

interface VenueActions {
  onCheckIn: (venueId: string) => void;
  onDirections: (venue: { lat: number; lng: number }) => void;
  onShare: (venueId: string) => void;
  onCreatePlan: (venueId: string) => void;
  onInviteFriends: (venueId: string) => void;
}

export function useVenueActions(): VenueActions {
  const { checkIn, share } = useVenueInteractions();

  const onCheckIn = useCallback((venueId: string) => {
    checkIn(venueId);
  }, [checkIn]);

  const onDirections = useCallback((venue: { lat: number; lng: number }) => {
    openNativeMaps({ lat: venue.lat, lng: venue.lng });
  }, []);

  const onShare = useCallback((venueId: string) => {
    share(venueId);
    // TODO: Implement native sharing
  }, [share]);

  const onCreatePlan = useCallback((venueId: string) => {
    // TODO: Navigate to plan creation with venue pre-selected
    console.log('Create plan with venue:', venueId);
  }, []);

  const onInviteFriends = useCallback((venueId: string) => {
    // TODO: Open friend invitation modal
    console.log('Invite friends to venue:', venueId);
  }, []);

  return {
    onCheckIn,
    onDirections,
    onShare,
    onCreatePlan,
    onInviteFriends,
  };
}