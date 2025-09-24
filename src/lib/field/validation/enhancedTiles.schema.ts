import { z } from "zod";

// Reusable small schemas
export const VibeHSL = z.object({
  h: z.number().finite(),   // 0..360 (we won't clamp here)
  s: z.number().finite(),   // 0..100
  l: z.number().finite(),   // 0..100
});

export const LatLng = z.object({
  lat: z.number().finite(),
  lng: z.number().finite(),
});

export const Velocity = z.object({
  vx: z.number().finite(),
  vy: z.number().finite(),
  magnitude: z.number().min(0),
  heading: z.number(),                 // radians from north
  confidence: z.number().min(0).max(1)
});

export const MovementMode = z.enum([
  "stationary", "walking", "cycling", "driving", "transit"
]);

// One tile
export const EnhancedTileSchema = z.object({
  tile_id: z.string().min(1),
  centroid: LatLng.optional(),         // may be absent in some rows
  crowd_count: z.number().int().min(0),
  avg_vibe: VibeHSL,
  updated_at: z.string().datetime(),   // ISO timestamp
  active_floq_ids: z.array(z.string().uuid()).optional().default([]),

  velocity: Velocity.optional(),
  movement_mode: MovementMode.optional().default("stationary"),
  momentum: z.number().min(0).max(1).optional(),
  cohesion_score: z.number().min(0).max(1).optional(),
  convergence_vector: z.null().optional(), // kept null client-side; worker computes pixel-space
  afterglow_intensity: z.number().min(0).max(1).optional().default(0),
  history: z.array(z.object({
    timestamp: z.string().datetime(),
    crowd_count: z.number().int().min(0),
    centroid: LatLng,
    vibe: VibeHSL.optional()
  })).optional().default([]),

  trail_segments: z.array(z.object({
    x: z.number(), y: z.number(),
    timestamp: z.number().int().nonnegative(),
    alpha: z.number().min(0).max(1)
  })).optional().default([])
});

export const EnhancedTilesResponse = z.object({
  tiles: z.array(EnhancedTileSchema)
});

export type EnhancedTilesResponseT = z.infer<typeof EnhancedTilesResponse>;
export type EnhancedTileT = z.infer<typeof EnhancedTileSchema>;