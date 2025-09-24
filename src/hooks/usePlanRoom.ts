import { useState, useCallback } from 'react';
import { usePlanPresence } from '@/hooks/usePlanPresence';
import { useRealtimePlanSync } from '@/hooks/useRealtimePlanSync';
import { usePlanParticipants } from '@/hooks/usePlanParticipants';

type PlanMode = 'planning' | 'executing';

/**
 * Normalise various participant shapes to a single profile_id string.
 * After the 2025-07-27 migration we **only** reference profile_id.
 */
const getProfileId = (participant: any): string | undefined =>
  participant.profile_id ?? participant.profileId;

/**
 * Consolidated hook for real-time plan collaboration
 * Combines presence, sync, and participant data into a single interface.
 */
export function usePlanRoom(planId: string) {
  const [planMode, setPlanMode] = useState<PlanMode>('planning');

  // Individual hooks
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
    onPlanFinalized: () => setPlanMode('executing'),
  });

  /** Merge & de-duplicate participants coming from presence + DB query */
  const allParticipants = [
    ...(presence.participants ?? []),
    ...(participantsQuery.data ?? []),
  ].filter(
    (participant, index, self) =>
      index ===
      self.findIndex(p => getProfileId(p) === getProfileId(participant)),
  );

  /** Presence helpers */
  const updatePresence = useCallback(
    async (activity: 'timeline' | 'chat' | 'venues' | 'idle') => {
      await presence.updateActivity(activity);
    },
    [presence.updateActivity],
  );

  const updatePlanMode = useCallback((mode: PlanMode) => {
    setPlanMode(mode);
  }, []);

  return {
    // Participants
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

    // Loading & error states
    isLoading: participantsQuery.isLoading,
    error: participantsQuery.error,
  };
}