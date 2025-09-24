import { z } from 'zod';

// Group Snapshot Token (GST)
export const GSTSchema = z.object({
  group_id: z.string(),
  member_passport_ids: z.array(z.string()),
  ttl_ms: z.number().int().positive(),
  policy_version: z.string(),
  created_at: z.date(),
  expires_at: z.date(),
});

export type GST = z.infer<typeof GSTSchema>;

// Group predictability assessment
export const GroupPredictabilitySchema = z.object({
  ok: z.boolean(),
  omega_G: z.number().min(0).max(1), // quantile spread proxy
  P_G: z.number().min(0).max(1),     // info gain proxy
  fallback: z.enum(['RELAX', 'PARTITION', 'INDIVIDUAL']).optional(),
  explanation: z.string().optional(),
});

export type GroupPredictability = z.infer<typeof GroupPredictabilitySchema>;

// Group planning input
export const GroupPlanInputSchema = z.object({
  group_id: z.string(),
  member_ids: z.array(z.string()),
  intent_data: z.record(z.unknown()), // per-member intent signals
  constraints: z.object({
    max_travel_time: z.number().optional(),
    budget_range: z.tuple([z.number(), z.number()]).optional(),
    time_window: z.tuple([z.date(), z.date()]).optional(),
    required_vibes: z.array(z.string()).optional(),
  }).optional(),
});

export type GroupPlanInput = z.infer<typeof GroupPlanInputSchema>;

// Group planning response
export const GroupPlanResponseSchema = z.object({
  gst: GSTSchema,
  predictability: GroupPredictabilitySchema,
  recommendations: z.array(z.object({
    id: z.string(),
    title: z.string(),
    confidence: z.number(),
    member_fit_scores: z.record(z.number()),
    explanation: z.string(),
  })),
  fallback_options: z.array(z.object({
    type: z.enum(['RELAX', 'PARTITION', 'INDIVIDUAL']),
    description: z.string(),
    sub_groups: z.array(z.array(z.string())).optional(),
  })).optional(),
});

export type GroupPlanResponse = z.infer<typeof GroupPlanResponseSchema>;