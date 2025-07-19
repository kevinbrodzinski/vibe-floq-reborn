import { z as zVote } from 'zod';

export const VoteTypeEnum = zVote.enum(['yes', 'no', 'maybe']);
export type VoteType = zVote.infer<typeof VoteTypeEnum>;