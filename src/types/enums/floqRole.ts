import { z } from 'zod';

export const FloqRoleEnum = z.enum(['creator', 'member', 'moderator', 'guest']);
export type FloqRole = z.infer<typeof FloqRoleEnum>;

export const safeFloqRole = (input: unknown): FloqRole => {
  const parsed = FloqRoleEnum.safeParse(input);
  return parsed.success ? parsed.data : 'member';
};