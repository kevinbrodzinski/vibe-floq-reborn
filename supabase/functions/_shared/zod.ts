import { z } from "https://deno.land/x/zod@v3.22.4/mod.ts";

export { z };

export function parseJson<T extends z.ZodTypeAny>(
  schema: T,
  json: unknown
): { data?: z.infer<T>; error?: Response } {
  const res = schema.safeParse(json);
  if (!res.success) {
    return {
      error: new Response(JSON.stringify({ error: "Invalid request", issues: res.error.issues }), {
        status: 400,
        headers: { "Content-Type": "application/json", "Cache-Control": "no-store" }
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

export type PresenceUpsert = z.infer<typeof PresenceUpsertSchema>;
export type InviteCreate = z.infer<typeof InviteCreateSchema>;
