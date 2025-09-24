import { useVenueJoin } from '@/hooks/useVenueJoin';
import { useVenueInteractions } from '@/hooks/useVenueInteractions';
import { useVenueActions } from '@/hooks/useVenueActions';
import { useVenueDetails } from '@/hooks/useVenueDetails';
import { useFlowRecorder } from '@/hooks/useFlowRecorder';
import { useGeo } from '@/hooks/useGeo';
import { useMemo } from 'react';

interface VenueManagerOptions {
  venueId?: string | null;
  autoFetchDetails?: boolean;
}

/**
 * Master venue management hook that combines all venue operations.
 * Provides a unified interface for venue interactions, flow recording, and state management.
 */
export function useVenueManager({ venueId, autoFetchDetails = true }: VenueManagerOptions = {}) {
  const { coords } = useGeo();
  const flowRecorder = useFlowRecorder();
  
  // Venue operations
  const venueJoin = useVenueJoin(venueId, coords?.lat ?? null, coords?.lng ?? null);
  const venueInteractions = useVenueInteractions();
  const venueActions = useVenueActions();
  
  // Venue data
  const venueDetails = useVenueDetails(autoFetchDetails ? venueId : null);

  // Unified operations with smart defaults and error handling
  const operations = useMemo(() => ({
    // Flow operations
    flow: {
      start: async (options?: { visibility?: 'owner' | 'friends' | 'public' }) => {
        try {
          await flowRecorder.start({
            visibility: options?.visibility ?? 'public',
            start_center: coords ? { lng: coords.lng, lat: coords.lat } : undefined
          });
          return { success: true };
        } catch (error) {
          console.error('[VenueManager] Flow start failed:', error);
          return { success: false, error };
        }
      },
      stop: async () => {
        try {
          await flowRecorder.stop();
          return { success: true };
        } catch (error) {
          console.error('[VenueManager] Flow stop failed:', error);
          return { success: false, error };
        }
      },
      append: async (segment: Parameters<typeof flowRecorder.append>[0]) => {
        try {
          await flowRecorder.append(segment);
          return { success: true };
        } catch (error) {
          console.error('[VenueManager] Flow append failed:', error);
          return { success: false, error };
        }
      }
    },

    // Venue operations
    venue: {
      join: async (targetVenueId?: string) => {
        const id = targetVenueId ?? venueId;
        if (!id) throw new Error('No venue ID provided');
        
        try {
          await venueJoin.join({ vibeOverride: null });
          return { success: true };
        } catch (error) {
          console.error('[VenueManager] Venue join failed:', error);
          return { success: false, error };
        }
      },
      
      leave: async () => {
        try {
          await venueJoin.leave();
          return { success: true };
        } catch (error) {
          console.error('[VenueManager] Venue leave failed:', error);
          return { success: false, error };
        }
      },

      checkIn: (targetVenueId?: string) => {
        const id = targetVenueId ?? venueId;
        if (!id) throw new Error('No venue ID provided');
        
        venueInteractions.checkIn(id, {
          lat: coords?.lat,
          lng: coords?.lng
        });
      },

      save: (targetVenueId?: string) => {
        const id = targetVenueId ?? venueId;
        if (!id) throw new Error('No venue ID provided');
        
        venueInteractions.share(id, {
          lat: coords?.lat,
          lng: coords?.lng
        });
      },

      plan: (targetVenueId?: string) => {
        const id = targetVenueId ?? venueId;
        if (!id) throw new Error('No venue ID provided');
        
        venueInteractions.plan(id, {
          lat: coords?.lat,
          lng: coords?.lng
        });
      },

      favorite: (targetVenueId?: string) => {
        const id = targetVenueId ?? venueId;
        if (!id) throw new Error('No venue ID provided');
        
        venueInteractions.favorite(id, {
          lat: coords?.lat,
          lng: coords?.lng
        });
      },

      getDirections: (venue?: { lat: number; lng: number }) => {
        if (venue) {
          venueActions.onDirections(venue);
        } else if (venueDetails.data?.lat && venueDetails.data?.lng) {
          venueActions.onDirections({ 
            lat: venueDetails.data.lat, 
            lng: venueDetails.data.lng 
          });
        } else {
          console.warn('[VenueManager] No coordinates available for directions');
        }
      },

      createPlan: (targetVenueId?: string) => {
        const id = targetVenueId ?? venueId;
        if (!id) throw new Error('No venue ID provided');
        
        venueActions.onCreatePlan(id);
      },

      inviteFriends: (targetVenueId?: string) => {
        const id = targetVenueId ?? venueId;
        if (!id) throw new Error('No venue ID provided');
        
        venueActions.onInviteFriends(id);
      }
    },

    // Batch operations
    batch: {
      joinAndStartFlow: async (targetVenueId?: string) => {
        const id = targetVenueId ?? venueId;
        if (!id) throw new Error('No venue ID provided');
        
        try {
          // Start flow first, then join venue
          await flowRecorder.start({
            visibility: 'public',
            start_center: coords ? { lng: coords.lng, lat: coords.lat } : undefined
          });
          
          await venueJoin.join({ vibeOverride: null });
          
          // Record venue as first flow segment
          if (venueDetails.data?.lat && venueDetails.data?.lng) {
            await flowRecorder.append({
              center: { lng: venueDetails.data.lng, lat: venueDetails.data.lat },
              venue_id: id,
              exposure_fraction: 0.5, // default outdoor assumption
            });
          }
          
          return { success: true };
        } catch (error) {
          console.error('[VenueManager] Join and start flow failed:', error);
          return { success: false, error };
        }
      },

      checkInAndSave: (targetVenueId?: string) => {
        const id = targetVenueId ?? venueId;
        if (!id) throw new Error('No venue ID provided');
        
        // Execute both actions
        venueInteractions.checkIn(id, {
          lat: coords?.lat,
          lng: coords?.lng
        });
        
        venueInteractions.share(id, {
          lat: coords?.lat,
          lng: coords?.lng
        });
      }
    }
  }), [flowRecorder, venueJoin, venueInteractions, venueActions, venueDetails.data, coords, venueId]);

  return {
    // Data
    venue: venueDetails.data,
    isLoadingVenue: venueDetails.isLoading,
    venueError: venueDetails.error,
    
    // Flow state
    flowState: flowRecorder.state,
    flowId: flowRecorder.flowId,
    flowSegments: flowRecorder.segments,
    sunExposure: {
      sui01: flowRecorder.sui01,
      sunExposedMin: flowRecorder.sunExposedMin,
      elapsedMin: flowRecorder.elapsedMin
    },
    
    // Join/leave state
    isJoining: venueJoin.joinPending,
    isLeaving: venueJoin.leavePending,
    isTrackingInteraction: venueInteractions.isLoading,
    
    // Location
    coordinates: coords,
    hasLocation: !!coords,
    
    // Operations
    ...operations,
    
    // Raw hooks (for advanced usage)
    hooks: {
      venueJoin,
      venueInteractions,
      venueActions,
      venueDetails,
      flowRecorder
    }
  };
}