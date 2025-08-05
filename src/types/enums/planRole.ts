import { z } from 'zod';

export const PlanRoleEnum = z.enum(['participant', 'organizer']);
export type PlanRole = z.infer<typeof PlanRoleEnum>;

export const safePlanRole = (input: unknown): PlanRole => {
  const parsed = PlanRoleEnum.safeParse(input);
  return parsed.success ? parsed.data : 'participant';
};