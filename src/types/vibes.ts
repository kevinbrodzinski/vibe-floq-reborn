import { z } from 'zod';

export const VibeEnum = z.enum([
  'chill',
  'hype',
  'curious',
  'social',
  'solo',
  'romantic',
  'weird',
  'down',
  'flowing',
  'open',
  'energetic',
  'excited',
  'focused',
]);

export type Vibe = z.infer<typeof VibeEnum>;