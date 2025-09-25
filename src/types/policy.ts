import { z } from 'zod';

// Core policy types
export const PolicyClassSchema = z.enum(['presence', 'checkin', 'planning', 'ranking', 'group']);
export type PolicyClass = z.infer<typeof PolicyClassSchema>;

export const ClaimKindSchema = z.enum(['label', 'band', 'raw']);
export type ClaimKind = z.infer<typeof ClaimKindSchema>;

export const VenueSafetySchema = z.enum(['safe', 'sensitive', 'unknown']);
export type VenueSafety = z.infer<typeof VenueSafetySchema>;

export const RedactionLevelSchema = z.enum(['label_only', 'banded', 'raw']);
export type RedactionLevel = z.infer<typeof RedactionLevelSchema>;

// Policy input for ladder evaluation
export const PolicyInputSchema = z.object({
  claim: z.object({
    kind: ClaimKindSchema,
    value: z.union([z.string(), z.number()]),
    confidence: z.number().min(0).max(1).optional(),
  }),
  theta: z.number().min(0).max(1),
  omega: z.number().min(0).max(1),
  class: PolicyClassSchema,
  lastChangeAt: z.date().optional(),
  venueSafety: VenueSafetySchema.optional(),
  userId: z.string().optional(),
});

export type PolicyInput = z.infer<typeof PolicyInputSchema>;

// Policy decision output
export const PolicyDecisionSchema = z.object({
  allowed: z.boolean(),
  reason: z.string().optional(),
  redactionLevel: RedactionLevelSchema.optional(),
  observability: z.object({
    min_interval_enforced: z.boolean(),
    hysteresis_applied: z.boolean(),
    theta_passed: z.boolean(),
    omega_passed: z.boolean(),
    venue_safety_passed: z.boolean(),
  }),
});

export type PolicyDecision = z.infer<typeof PolicyDecisionSchema>;