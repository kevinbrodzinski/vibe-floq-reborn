import { useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';

/**
 * Hook to ensure plan participation is recorded for afterglow generation
 */
export const usePlanParticipationRecorder = () => {
  
  const recordParticipation = useCallback(async (planId: string, stopId?: string) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) throw new Error('User not authenticated');

      // Check if participation already exists
      const { data: existing } = await supabase
        .from('plan_participants')
        .select('id')
        .eq('plan_id', planId)
        .eq('profile_id', user.id)
        .single();

      if (!existing) {
        // Record initial plan participation for afterglow
        const { error: participationError } = await supabase
          .from('plan_participants')
          .insert({
            plan_id: planId,
            profile_id: user.id,
            joined_at: new Date().toISOString(),
          });

        if (participationError) {
          console.error('Failed to record plan participation:', participationError);
          // Continue even if recording fails
        } else {
          console.log('Successfully recorded plan participation:', planId);
        }
      }

      // If stopping at a specific location, record that too
      if (stopId) {
        const { error: stopError } = await supabase
          .from('plan_check_ins')
          .upsert({
            plan_id: planId,
            stop_id: stopId,
            participant_id: user.id,
            checked_in_at: new Date().toISOString(),
          }, {
            onConflict: 'plan_id,stop_id,participant_id'
          });

        if (stopError) {
          console.error('Failed to record plan stop:', stopError);
        }
      }

    } catch (error) {
      console.error('Plan participation recording error:', error);
    }
  }, []);

  return { recordParticipation };
};