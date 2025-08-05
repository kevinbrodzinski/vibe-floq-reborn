import { z as zVote } from 'zod';

export const VoteTypeEnum = zVote.enum(['yes', 'no', 'maybe']);
export type VoteType = zVote.infer<typeof VoteTypeEnum>;

export const safeVoteType = (input: unknown): VoteType => {
  const parsed = VoteTypeEnum.safeParse(input);
  return parsed.success ? parsed.data : 'maybe';
};