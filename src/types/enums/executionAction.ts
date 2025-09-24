import { z } from 'zod';

export const ExecutionActionEnum = z.enum([
  'vote',
  'rsvp',
  'check-in',
  'stop-action',
]);

export type ExecutionAction = z.infer<typeof ExecutionActionEnum>;

export const safeExecutionAction = (input: unknown): ExecutionAction => {
  const parsed = ExecutionActionEnum.safeParse(input);
  return parsed.success ? parsed.data : 'stop-action';
};