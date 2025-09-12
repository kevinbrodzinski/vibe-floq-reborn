import { supabase } from '@/integrations/supabase/client';
import { endRally } from './rally';

export async function endRallyWithAfterglow(rallyId: string) {
  return await endRally(rallyId);
}