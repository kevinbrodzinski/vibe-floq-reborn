import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { QK } from '@/constants/queryKeys'

export function useInvalidateDiscover() {
  const qc = useQueryClient()
  const { user } = useAuth()

  return () => {
    qc.invalidateQueries({ queryKey: ['discover', user?.id] })
    qc.invalidateQueries({ queryKey: ['friends', user?.id] })
    
    // Invalidate People Discovery Stack queries when friendship changes
    if (user?.id) {
      qc.invalidateQueries({ queryKey: ['vibe-breakdown', user.id] })
      qc.invalidateQueries({ queryKey: ['common-venues', user.id] })
      qc.invalidateQueries({ queryKey: ['plan-suggestions', user.id] })
      qc.invalidateQueries({ queryKey: ['crossed-paths-stats', user.id] })
    }
  }
}