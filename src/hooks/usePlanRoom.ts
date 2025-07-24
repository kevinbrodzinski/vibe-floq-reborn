import { useState, useEffect, useCallback } from 'react';
import { usePlanPresence } from '@/hooks/usePlanPresence';
import { useRealtimePlanSync } from '@/hooks/useRealtimePlanSync';
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
  
  const sync = useRealtimePlanSync({
    plan_id: planId,
    onParticipantJoined: (participant) => {
      console.log('Participant joined:', participant);
    },
    onVoteCast: (voteData) => {
      console.log('Vote update:', voteData);
    },
    onStopUpdated: (stopData) => {
      console.log('Stop update:', stopData);
    },
    onStopAdded: (stopData) => {
      console.log('Stop added:', stopData);
    },
    onPlanFinalized: (plan) => {
      setPlanMode('executing');
    }
  });

  // Combine participants from different sources
  const allParticipants = [
    ...(presence.participants || []),
    ...(participantsQuery.data || [])
  ].filter((participant, index, self) => 
    index === self.findIndex(p => 
      ('userId' in p ? p.userId : p.user_id) === ('userId' in participant ? participant.userId : participant.user_id)
    )
  );

  const updatePresence = useCallback(async (activity: 'timeline' | 'chat' | 'venues' | 'idle') => {
    await presence.updateActivity(activity);
  }, [presence.updateActivity]);

  const updatePlanMode = useCallback(async (mode: 'planning' | 'executing') => {
    setPlanMode(mode);
  }, []);

  return {
    // Participant data
    participants: allParticipants,
    participantCount: allParticipants.length,
    
    // Connection status
    isConnected: presence.isConnected && sync.isConnected,
    
    // Presence management
    updatePresence,
    updateCheckInStatus: presence.updateCheckInStatus,
    
    // Plan state
    planMode,
    updatePlanMode,
    
    // Loading states
    isLoading: participantsQuery.isLoading,
    error: participantsQuery.error,
  };
}