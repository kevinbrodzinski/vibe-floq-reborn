import { useQuery } from '@tanstack/react-query';
import {
  getSharedActivitySuggestions,
  SharedActivityContext,
  ActivitySuggestion,
} from '@/lib/intelligence';

export const useSharedActivitySuggestions = (
  ctx: SharedActivityContext,
  { enabled = true } = {},
) =>
  useQuery<ActivitySuggestion[]>({
    queryKey: ['sharedActivitySuggestions', ctx.currentProfileId, ctx.targetProfileId],
    queryFn: () => getSharedActivitySuggestions(ctx),
    enabled,
    staleTime: 60 * 60_000, // 1 hour
    retry: 1,
  });