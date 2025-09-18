import { z } from 'zod';
import { VibeEnum } from '@/types/enums/vibes';

export const WalkableFloqSchema = z.object({
  id: z.string().optional(),
  title: z.string().optional(),
  primary_vibe: VibeEnum.optional(),
  participant_count: z.number().optional(),
  distance_meters: z.number().optional(),
  starts_at: z.string().optional(),
  // Additional fields needed by FloqCard
  max_participants: z.number().optional(),
  is_joined: z.boolean().optional(),
  ends_at: z.string().optional(),
  boost_count: z.number().optional(),
  creator_id: z.string().optional(),
  description: z.string().optional(),
  members: z.array(z.any()).optional(),
  friends_going_count: z.number().optional(),
  friends_going_avatars: z.array(z.string()).optional(),
  friends_going_names: z.array(z.string()).optional(),
  starts_in_min: z.number().optional(),
  name: z.string().optional(),
});

export type WalkableFloq = z.infer<typeof WalkableFloqSchema>;