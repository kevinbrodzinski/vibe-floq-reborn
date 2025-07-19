import { z } from 'zod';
import { VibeEnum, type Vibe } from '@/types/vibes';

const BaseFloqSchema = z.object({
  id: z.string(),
  title: z.string().nullable().optional(),
  name: z.string().nullable().optional(), 
  primary_vibe: VibeEnum,
  creator_id: z.string().nullable().optional(),
  starts_at: z.string().nullable().optional(),
  ends_at: z.string().nullable().optional(),
  last_activity_at: z.string().nullable().optional(),
  created_at: z.string().nullable().optional(),
  deleted_at: z.string().nullable().optional(),
});

export const MyFloqSchema = BaseFloqSchema;

export const ParticipantRowSchema = z.object({
  floq_id: z.string(),
  role: z.string(),
  joined_at: z.string(),
  floqs: BaseFloqSchema.nullable(),
});

export interface MyFloq {
  id: string;
  title: string;
  name?: string;
  primary_vibe: Vibe;
  participant_count: number;
  role: string;
  joined_at: string;
  last_activity_at: string;
  starts_at?: string;
  ends_at?: string;
  creator_id?: string;
  distance_meters?: number;
  is_creator: boolean;
}