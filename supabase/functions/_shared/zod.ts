import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

export { z };

export function parseJson<T extends z.ZodTypeAny>(
  schema: T,
  json: unknown,
  extraHeaders?: HeadersInit
): { data?: z.infer<T>; error?: Response } {
  const res = schema.safeParse(json);
  if (!res.success) {
    return {
      error: new Response(JSON.stringify({ error: "Invalid request", issues: res.error.issues }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store", ...(extraHeaders ?? {}) }
      })
    };
  }
  return { data: res.data };
}

export const PresenceUpsertSchema = z.object({
  lat: z.number().min(-90).max(90),
  lng: z.number().min(-180).max(180),
  vibe: z.string().max(64).optional(),
  venue_id: z.string().uuid().nullable().optional(),
  broadcast_radius: z.number().min(0).max(5000).optional()
});

export const InviteCreateSchema = z.object({
  floq_id: z.string().uuid(),
  invitee_profile_id: z.string().uuid(),
  message: z.string().max(500).optional()
});

/* ---------- Common primitives ---------- */
export const UUID = () => z.string().uuid();
export const ISODate = () => z.string().datetime().optional();
export const NonEmpty = () => z.string().min(1);
export const Pagination = z.object({
  limit: z.number().int().min(1).max(200).default(50),
  cursor: z.string().optional()
});

/* ---------- Edge-specific schemas ---------- */

// get_field_tiles_enhanced
export const FieldTilesSchema = z.object({
  tile_ids: z.array(z.string()).max(250),
  include_history: z.boolean().default(false),
  time_window_seconds: z.number().int().min(0).max(3600).default(300)
});

// venue-intelligence (get-venue-intelligence)
export const VenueIntelSchema = z.object({
  mode: z.enum(["social-suggestions", "people", "posts", "energy"]),
  venue_id: z.string().uuid().optional(),
  user_id: z.string().uuid().optional(),
  limit: z.number().int().min(1).max(100).default(10)
});

// search-threads
export const SearchThreadsSchema = z.object({
  query: z.string().min(1).max(200),
  limit: z.number().int().min(1).max(50).default(20)
});

// generate-plan-summary
export const PlanSummarySchema = z.object({
  plan_id: z.string().uuid(),
  mode: z.enum(["finalized", "afterglow"]).default("finalized")
});

/* Types */
export type FieldTilesReq    = z.infer<typeof FieldTilesSchema>;
export type VenueIntelReq    = z.infer<typeof VenueIntelSchema>;
export type SearchThreadsReq = z.infer<typeof SearchThreadsSchema>;
export type PlanSummaryReq   = z.infer<typeof PlanSummarySchema>;
export type PresenceUpsert   = z.infer<typeof PresenceUpsertSchema>;
export type InviteCreate     = z.infer<typeof InviteCreateSchema>;
