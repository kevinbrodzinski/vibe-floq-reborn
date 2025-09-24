import { z } from 'zod';

export const GenericStatusEnum = z.enum(['pending', 'success', 'error']);
export type GenericStatus = z.infer<typeof GenericStatusEnum>;

export const safeGenericStatus = (input: unknown): GenericStatus => {
  const parsed = GenericStatusEnum.safeParse(input);
  return parsed.success ? parsed.data : 'pending';
};