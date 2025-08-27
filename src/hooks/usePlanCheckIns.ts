import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { usePlanParticipationRecorder } from './usePlanParticipationRecorder';

export interface PlanCheckIn {
  id: string;
  plan_id: string;
  stop_id: string;
  participant_id: string;
  checked_in_at: string;
  checked_out_at?: string;
  location?: any;
  device_id?: string;
  geo_hash?: string;
  created_at: string;
}

export async function checkIntoStop(
  planId: string,
  stopId: string,
  { lat, lng }: { lat: number; lng: number },
  deviceId?: string,
) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.id) throw new Error('Not authenticated');

  // First ensure plan participation is recorded for afterglow
  const { data: existingParticipant } = await supabase
    .from('plan_participants')
    .select('id')
    .eq('plan_id', planId as any)
    .eq('profile_id', user.id as any)
    .single();

  if (!existingParticipant) {
    await supabase
      .from('plan_participants')
      .insert({
        plan_id: planId,
        profile_id: user.id,
        joined_at: new Date().toISOString(),
      } as any);
  }

  // Then record the check-in
  const { error } = await supabase.from('plan_check_ins' as any).insert({
    plan_id: planId,
    stop_id: stopId,
    participant_id: user.id,
    location: lat && lng ? `SRID=4326;POINT(${lng} ${lat})` : null,
    device_id: deviceId,
  } as any);
  
  if (error) throw error;
}

export async function checkOutOfStop(
  checkInId: string
) {
  const { error } = await supabase
    .from('plan_check_ins' as any)
    .update({ checked_out_at: new Date().toISOString() } as any)
    .eq('id', checkInId as any);
    
  if (error) throw error;
}

export async function getCurrentCheckIns(planId: string, profileId: string): Promise<PlanCheckIn[]> {
  const { data, error } = await supabase
    .from('plan_check_ins' as any)
    .select('*')
    .eq('plan_id', planId as any)
    .eq('participant_id', profileId as any)
    .is('checked_out_at', null);
    
  if (error) throw error;
  return (data as unknown as PlanCheckIn[]) || [];
}

export function usePlanCheckIns(planId?: string, profileId?: string) {
  return useQuery({
    queryKey: ['plan-check-ins', planId, profileId],
    enabled: !!planId && !!profileId,
    queryFn: () => getCurrentCheckIns(planId!, profileId!),
    refetchOnWindowFocus: false,
  });
}