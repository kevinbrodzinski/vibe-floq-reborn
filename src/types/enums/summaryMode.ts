import { z } from 'zod';

export const SummaryModeEnum = z.enum(['finalized', 'afterglow']);
export type SummaryMode = z.infer<typeof SummaryModeEnum>;

export const safeSummaryMode = (input: unknown): SummaryMode => {
  const parsed = SummaryModeEnum.safeParse(input);
  return parsed.success ? parsed.data : 'finalized';
};