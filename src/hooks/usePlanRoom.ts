import { useState, useEffect, useCallback } from 'react';
import { usePlanPresence } from '@/hooks/usePlanPresence';
import { usePlanRealTimeSync } from '@/hooks/usePlanRealTimeSync';
import { usePlanParticipants } from '@/hooks/usePlanParticipants';

/**
 * Consolidated hook for real-time plan collaboration
 * Combines presence, sync, and participant data into a single interface
 */
export function usePlanRoom(planId: string) {
  const [planMode, setPlanMode] = useState<'planning' | 'executing'>('planning');

  // Individual hooks for different aspects
  const presence = usePlanPresence(planId);
  const participantsQuery = usePlanParticipants(planId);
  
  const sync = usePlanRealTimeSync(planId, {
    onParticipantJoin: (participant) => {
      console.log('Participant joined:', participant);
    },
    onVoteUpdate: (voteData) => {
      console.log('Vote update:', voteData);
    },
    onStopUpdate: (stopData) => {
      console.log('Stop update:', stopData);
    },
    onChatMessage: (message) => {
      console.log('New chat message:', message);
    },
    onRSVPUpdate: (rsvpData) => {
      console.log('RSVP update:', rsvpData);
    },
    onPlanModeChange: (mode) => {
      setPlanMode(mode);
    }
  });

  // Combine participants from different sources
  const allParticipants = [
    ...(presence.participants || []),
    ...(participantsQuery.data || [])
  ].filter((participant, index, self) => 
    index === self.findIndex(p => p.user_id === participant.user_id)
  );

  const updatePresence = useCallback(async (activity: 'timeline' | 'chat' | 'venues' | 'idle') => {
    await presence.updateActivity(activity);
  }, [presence.updateActivity]);

  const updatePlanMode = useCallback(async (mode: 'planning' | 'executing') => {
    setPlanMode(mode);
    if (sync.updatePlanMode) {
      await sync.updatePlanMode(mode);
    }
  }, [sync.updatePlanMode]);

  return {
    // Participant data
    participants: allParticipants,
    participantCount: sync.participantCount || allParticipants.length,
    
    // Connection status
    isConnected: presence.isConnected && sync.isConnected,
    
    // Presence management
    updatePresence,
    updateCheckInStatus: presence.updateCheckInStatus,
    
    // Plan state
    planMode: sync.planMode || planMode,
    updatePlanMode,
    
    // Active editing participants
    activeParticipants: sync.activeParticipants || [],
    
    // Loading states
    isLoading: participantsQuery.isLoading,
    error: participantsQuery.error,
  };
}