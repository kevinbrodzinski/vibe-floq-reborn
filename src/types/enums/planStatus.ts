import { z as zPlan } from 'zod';

export const PlanStatusEnum = zPlan.enum([
  'draft',
  'active',
  'closed', 
  'cancelled',
  'finalized',
  'executing',
  'completed'
]);
export type PlanStatus = zPlan.infer<typeof PlanStatusEnum>;

export const safePlanStatus = (input: unknown): PlanStatus => {
  const parsed = PlanStatusEnum.safeParse(input);
  return parsed.success ? parsed.data : 'draft';
};