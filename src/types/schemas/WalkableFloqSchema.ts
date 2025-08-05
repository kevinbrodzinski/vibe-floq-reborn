import { z } from 'zod';
import { VibeEnum } from '@/types/enums/vibes';

export const WalkableFloqSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  primary_vibe: VibeEnum,
  participant_count: z.number(),
  distance_meters: z.number(),
  starts_at: z.string().nullable(),
});

export type WalkableFloq = z.infer<typeof WalkableFloqSchema>;