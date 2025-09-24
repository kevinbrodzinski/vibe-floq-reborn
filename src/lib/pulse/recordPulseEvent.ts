import { supabase } from '@/integrations/supabase/client';
import type { PulseEvent } from '@/types/pulse';

export async function recordPulseEvent(e: Omit<PulseEvent,'id'|'created_at'>) {
  const { data, error } = await supabase.functions.invoke('record_pulse_event', {
    body: e,
  });
  if (error) throw error;
  return data as PulseEvent;
} 