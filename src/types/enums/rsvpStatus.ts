import { z } from 'zod';
import type { Database } from '@/integrations/supabase/types';

export const RSVPStatusEnum = z.enum([
  'attending',
  'maybe',
  'not_attending',
  'pending',
]);

// Use the database enum type if available, otherwise fall back to inferred type
export type RSVPStatus = Database['public']['Enums']['rsvp_status_enum'] extends string 
  ? Database['public']['Enums']['rsvp_status_enum'] 
  : z.infer<typeof RSVPStatusEnum>;

export const safeRSVPStatus = (input: unknown): RSVPStatus => {
  const parsed = RSVPStatusEnum.safeParse(input);
  return parsed.success ? parsed.data : 'pending';
};