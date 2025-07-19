import { z } from 'zod';
import { VibeEnum } from '@/types/vibes';

export const SearchFloqSchema = z.object({
  id: z.string(),
  title: z.string().nullable(),
  description: z.string().nullable().optional(),
  primary_vibe: VibeEnum,
  participant_count: z.number(),
  distance_meters: z.number(),
  starts_at: z.string().nullable().optional(),
  ends_at: z.string().nullable().optional(),
  creator_id: z.string().nullable().optional(),
  creator_username: z.string().nullable().optional(),
  creator_display_name: z.string().nullable().optional(),
  creator_avatar_url: z.string().nullable().optional(),
  user_joined_floq_id: z.string().nullable().optional(),
});

export type SearchFloq = z.infer<typeof SearchFloqSchema>;