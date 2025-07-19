import { z } from 'zod';

export const FloqRoleEnum = z.enum(['creator', 'member', 'moderator', 'guest']);
export type FloqRole = z.infer<typeof FloqRoleEnum>;