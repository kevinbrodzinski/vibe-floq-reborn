import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'

export type InvalidateDiscoverFn = () => void;

export function useInvalidateDiscover(): InvalidateDiscoverFn {
  const qc = useQueryClient()
  const { user } = useAuth()

  return () => {
    qc.invalidateQueries({ queryKey: ['discover', user?.id] })
    qc.invalidateQueries({ queryKey: ['friends', user?.id] })
    
    // Invalidate People Discovery Stack queries using predicate for partial matching
    if (user?.id) {
      qc.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === 'vibe-breakdown' &&
          query.queryKey[1] === user.id
      });
      
      qc.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === 'common-venues' &&
          query.queryKey[1] === user.id
      });
      
      qc.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === 'plan-suggestions' &&
          query.queryKey[1] === user.id
      });
      
      qc.invalidateQueries({
        predicate: (query) =>
          Array.isArray(query.queryKey) &&
          query.queryKey[0] === 'crossed-paths-stats' &&
          query.queryKey[1] === user.id
      });
    }
  }
}