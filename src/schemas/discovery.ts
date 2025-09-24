import { z } from 'zod';

// Venue schema for API validation
export const VenueSchema = z.object({
  id: z.string(),
  name: z.string(),
  distance_m: z.number().optional().default(0),
  rating: z.number().optional(),
  categories: z.array(z.string()).optional().default([]),
  description: z.string().optional(),
  address: z.string().optional(),
  photo_url: z.string().optional(),
  live_count: z.number().optional().default(0),
  vibe: z.string().optional(),
});

// Floq schema for API validation
export const FloqSchema = z.object({
  id: z.string(),
  title: z.string(),
  distance_m: z.number().optional().default(0),
  primary_vibe: z.enum(['social', 'chill', 'hype', 'curious', 'solo', 'romantic', 'weird', 'down', 'flowing', 'open']).optional(),
  participant_count: z.number().optional().default(0),
  max_participants: z.number().optional(),
  description: z.string().optional(),
  address: z.string().optional(),
  starts_at: z.string().optional(),
  ends_at: z.string().optional(),
  creator_name: z.string().optional(),
  creator_avatar: z.string().optional(),
  is_private: z.boolean().optional().default(false),
  is_joined: z.boolean().optional().default(false),
});

// AI suggestion schema
export const AiSuggestionSchema = z.object({
  id: z.string(),
  title: z.string(),
  type: z.enum(['venue', 'floq']),
  distance: z.number().optional().default(0),
  vibe: z.string().optional(),
  description: z.string().optional(),
  location: z.string().optional(),
  rating: z.number().optional(),
  tags: z.array(z.string()).optional().default([]),
});

export type ValidatedVenue = z.infer<typeof VenueSchema>;
export type ValidatedFloq = z.infer<typeof FloqSchema>;
export type ValidatedAiSuggestion = z.infer<typeof AiSuggestionSchema>;