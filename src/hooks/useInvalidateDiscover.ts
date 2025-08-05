import { useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/components/auth/EnhancedAuthProvider'

export function useInvalidateDiscover() {
  const qc = useQueryClient()
  const { user } = useAuth()

  return () => qc.invalidateQueries({ queryKey: ['discover', user?.id] })
}