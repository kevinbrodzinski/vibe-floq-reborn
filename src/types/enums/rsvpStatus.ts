import { z } from 'zod';

export const RSVPStatusEnum = z.enum([
  'attending',
  'maybe',
  'not_attending', 
  'pending',
]);

export type RSVPStatus = z.infer<typeof RSVPStatusEnum>;

export const safeRSVPStatus = (input: unknown): RSVPStatus => {
  const parsed = RSVPStatusEnum.safeParse(input);
  return parsed.success ? parsed.data : 'pending';
};