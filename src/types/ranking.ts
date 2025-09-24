import { z } from 'zod';

// Ranked item with metadata
export const RankedItemSchema = z.object({
  id: z.string(),
  score: z.number(),
  meta: z.record(z.unknown()).optional(),
});

export type RankedItem<TMeta = unknown> = {
  id: string;
  score: number;
  meta?: TMeta;
};

// Frequency cap state
export const FrequencyCapStateSchema = z.enum(['ok', 'limited', 'exhausted']);
export type FrequencyCapState = z.infer<typeof FrequencyCapStateSchema>;

// Ranking response with pacing metadata
export const RankResponseSchema = z.object({
  items: z.array(RankedItemSchema),
  topK_hash: z.string(), // digest of ranked order
  budget_remaining: z.number().min(0),
  frequency_cap_state: FrequencyCapStateSchema,
});

export type RankResponse<TMeta = unknown> = {
  items: Array<RankedItem<TMeta>>;
  topK_hash: string;
  budget_remaining: number;
  frequency_cap_state: FrequencyCapState;
};

// Uplift attribution record
export const UpliftRecordSchema = z.object({
  id: z.string(),
  profile_id: z.string(),
  item_id: z.string(),
  exposure_timestamp: z.date(),
  outcome_timestamp: z.date().optional(),
  treatment_score: z.number(),
  counterfactual_score: z.number(),
  uplift_estimate: z.number(),
  outcome_type: z.enum(['click', 'conversion', 'engagement', 'none']),
  metadata: z.record(z.unknown()).optional(),
});

export type UpliftRecord = z.infer<typeof UpliftRecordSchema>;