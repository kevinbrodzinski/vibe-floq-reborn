// Zod schemas for enhanced field tiles validation
import { z } from "zod";

// --- Primitives ---
export const VibeSchema = z.object({
  h: z.number().finite(), // degrees 0..360 (no clamp; renderer clamps)
  s: z.number().finite(), // 0..100
  l: z.number().finite(), // 0..100
});

export const VelocityVectorSchema = z.object({
  vx: z.number().finite(), // east m/s
  vy: z.number().finite(), // north m/s
  magnitude: z.number().nonnegative().finite(),
  // heading 0 = north; +clockwise (atan2(vx, vy))
  heading: z.number().finite(),
  confidence: z.number().min(0).max(1),
});

export const TemporalSnapshotSchema = z.object({
  timestamp: z.string().datetime(),
  crowd_count: z.number().int().nonnegative(),
  centroid: z.object({
    lat: z.number().finite(),
    lng: z.number().finite(),
  }),
  vibe: VibeSchema,
});

// --- Unions/enums ---
export const MovementModeSchema = z.enum([
  "stationary","walking","cycling","driving","transit"
]);

export const ConvergenceVectorSchema = z.object({
  target_tile_id: z.string().min(1),
  time_to_converge: z.number().positive(), // seconds
  probability: z.number().min(0).max(1),
});

// --- EnhancedFieldTile ---
export const EnhancedFieldTileSchema = z.object({
  tile_id: z.string().min(1),
  crowd_count: z.number().int().nonnegative(),
  avg_vibe: VibeSchema,
  active_floq_ids: z.array(z.string()).optional().default([]),
  updated_at: z.string().datetime(),
  center: z.tuple([z.number(), z.number()]).optional(), // [lng, lat]

  // hints (k-anon may remove)
  velocity: VelocityVectorSchema.optional(),
  movement_mode: MovementModeSchema.optional(),

  history: z.array(TemporalSnapshotSchema).max(10).optional(),
  momentum: z.number().min(0).max(1).optional(),
  cohesion_score: z.number().min(0).max(1).optional(),
  convergence_vector: ConvergenceVectorSchema.nullable().optional(),

  afterglow_intensity: z.number().min(0).max(1).optional(),
  
  // Trail segments (optional, managed by PIXI)
  trail_segments: z.array(z.object({
    x: z.number().finite(),
    y: z.number().finite(), 
    timestamp: z.number().int().positive(),
    alpha: z.number().min(0).max(1),
  })).optional(),
});

// Response: { tiles: EnhancedFieldTile[] }
export const EnhancedFieldTilesResponseSchema = z.object({
  tiles: z.array(EnhancedFieldTileSchema),
  convergences: z.array(z.object({
    id: z.string(),
    tileA: z.string(),
    tileB: z.string(), 
    meetingPoint: z.object({
      lat: z.number().finite(),
      lng: z.number().finite(),
    }),
    timeToMeet: z.number().positive(),
    probability: z.number().min(0).max(1),
  })).optional(),
});

// Runtime helper types - re-export from main domain types to avoid conflicts
export type { EnhancedFieldTile, EnhancedFieldTilesResponse } from './enhanced-field';