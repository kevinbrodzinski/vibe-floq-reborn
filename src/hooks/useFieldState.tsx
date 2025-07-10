import { useState, useCallback, useMemo, useRef } from 'react';
import type { Vibe } from '@/types';

interface FieldState {
  // Core state
  currentVibe: Vibe;
  timeWarpEnabled: boolean;
  constellationMode: boolean;
  
  // UI state
  dmSheetOpen: boolean;
  selectedFriend: any | null;
  venueDetailsSheetOpen: boolean;
  selectedVenue: any | null;
  clusterSheetOpen: boolean;
  selectedCluster: any | null;
  eventDetailsSheetOpen: boolean;
  selectedEvent: any | null;
  nearbyVenuesSheetOpen: boolean;
  
  // Map state
  viewport: any;
  mini: boolean;
  
  // Loading and error states
  isLoading: boolean;
  error: string | null;
}

interface FieldActions {
  // Core actions
  changeVibe: (vibe: Vibe) => void;
  toggleTimeWarp: () => void;
  toggleConstellationMode: () => void;
  
  // UI actions
  openDMSheet: (friend: any) => void;
  closeDMSheet: () => void;
  openVenueDetails: (venue: any) => void;
  closeVenueDetails: () => void;
  openClusterSheet: (cluster: any) => void;
  closeClusterSheet: () => void;
  openEventDetails: (event: any) => void;
  closeEventDetails: () => void;
  openNearbyVenues: () => void;
  closeNearbyVenues: () => void;
  
  // Map actions
  setViewport: (viewport: any) => void;
  setMini: (mini: boolean) => void;
  
  // State management
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  resetState: () => void;
}

const initialState: FieldState = {
  currentVibe: 'chill',
  timeWarpEnabled: false,
  constellationMode: false,
  
  dmSheetOpen: false,
  selectedFriend: null,
  venueDetailsSheetOpen: false,
  selectedVenue: null,
  clusterSheetOpen: false,
  selectedCluster: null,
  eventDetailsSheetOpen: false,
  selectedEvent: null,
  nearbyVenuesSheetOpen: false,
  
  viewport: null,
  mini: false,
  
  isLoading: false,
  error: null,
};

export const useFieldState = (): [FieldState, FieldActions] => {
  const [state, setState] = useState<FieldState>(initialState);
  const stateRef = useRef(state);
  stateRef.current = state;

  const actions = useMemo<FieldActions>(() => ({
    // Core actions
    changeVibe: useCallback((vibe: Vibe) => {
      setState(prev => ({ ...prev, currentVibe: vibe }));
    }, []),

    toggleTimeWarp: useCallback(() => {
      setState(prev => ({ ...prev, timeWarpEnabled: !prev.timeWarpEnabled }));
    }, []),

    toggleConstellationMode: useCallback(() => {
      setState(prev => ({ ...prev, constellationMode: !prev.constellationMode }));
    }, []),

    // UI actions
    openDMSheet: useCallback((friend: any) => {
      setState(prev => ({ 
        ...prev, 
        selectedFriend: friend, 
        dmSheetOpen: true,
        // Close other sheets
        venueDetailsSheetOpen: false,
        clusterSheetOpen: false,
        eventDetailsSheetOpen: false,
        nearbyVenuesSheetOpen: false,
      }));
    }, []),

    closeDMSheet: useCallback(() => {
      setState(prev => ({ 
        ...prev, 
        dmSheetOpen: false, 
        selectedFriend: null 
      }));
    }, []),

    openVenueDetails: useCallback((venue: any) => {
      setState(prev => ({ 
        ...prev, 
        selectedVenue: venue, 
        venueDetailsSheetOpen: true,
        // Close other sheets
        dmSheetOpen: false,
        clusterSheetOpen: false,
        eventDetailsSheetOpen: false,
        nearbyVenuesSheetOpen: false,
      }));
    }, []),

    closeVenueDetails: useCallback(() => {
      setState(prev => ({ 
        ...prev, 
        venueDetailsSheetOpen: false, 
        selectedVenue: null 
      }));
    }, []),

    openClusterSheet: useCallback((cluster: any) => {
      setState(prev => ({ 
        ...prev, 
        selectedCluster: cluster, 
        clusterSheetOpen: true,
        // Close other sheets
        dmSheetOpen: false,
        venueDetailsSheetOpen: false,
        eventDetailsSheetOpen: false,
        nearbyVenuesSheetOpen: false,
      }));
    }, []),

    closeClusterSheet: useCallback(() => {
      setState(prev => ({ 
        ...prev, 
        clusterSheetOpen: false, 
        selectedCluster: null 
      }));
    }, []),

    openEventDetails: useCallback((event: any) => {
      setState(prev => ({ 
        ...prev, 
        selectedEvent: event, 
        eventDetailsSheetOpen: true,
        // Close other sheets
        dmSheetOpen: false,
        venueDetailsSheetOpen: false,
        clusterSheetOpen: false,
        nearbyVenuesSheetOpen: false,
      }));
    }, []),

    closeEventDetails: useCallback(() => {
      setState(prev => ({ 
        ...prev, 
        eventDetailsSheetOpen: false, 
        selectedEvent: null 
      }));
    }, []),

    openNearbyVenues: useCallback(() => {
      setState(prev => ({ 
        ...prev, 
        nearbyVenuesSheetOpen: true,
        // Close other sheets
        dmSheetOpen: false,
        venueDetailsSheetOpen: false,
        clusterSheetOpen: false,
        eventDetailsSheetOpen: false,
      }));
    }, []),

    closeNearbyVenues: useCallback(() => {
      setState(prev => ({ 
        ...prev, 
        nearbyVenuesSheetOpen: false 
      }));
    }, []),

    // Map actions
    setViewport: useCallback((viewport: any) => {
      setState(prev => ({ ...prev, viewport }));
    }, []),

    setMini: useCallback((mini: boolean) => {
      setState(prev => ({ ...prev, mini }));
    }, []),

    // State management
    setLoading: useCallback((isLoading: boolean) => {
      setState(prev => ({ ...prev, isLoading }));
    }, []),

    setError: useCallback((error: string | null) => {
      setState(prev => ({ ...prev, error }));
    }, []),

    resetState: useCallback(() => {
      setState(initialState);
    }, []),
  }), []);

  return [state, actions];
};