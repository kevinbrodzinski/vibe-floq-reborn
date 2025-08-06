import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'

export type InvalidateDiscoverFn = () => void;

export function useInvalidateDiscover(): InvalidateDiscoverFn {
  const qc = useQueryClient()
  const { user } = useAuth()

  return () => {
    if (!user?.id) {
      console.warn('useInvalidateDiscover called without authenticated user');
      return;
    }

    qc.invalidateQueries({ queryKey: ['discover', user.id] })
    qc.invalidateQueries({ queryKey: ['friends', user.id] })
    
    // Invalidate People Discovery Stack queries using predicate for partial matching
    const discoveryQueryHeads = ['vibe-breakdown', 'common-venues', 'plan-suggestions', 'crossed-paths-stats'];
    qc.invalidateQueries({
      predicate: (query) =>
        Array.isArray(query.queryKey) &&
        discoveryQueryHeads.includes(query.queryKey[0] as string) &&
        query.queryKey[1] === user.id
    });
  }
}