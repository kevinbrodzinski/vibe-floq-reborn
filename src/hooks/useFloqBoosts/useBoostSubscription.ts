import { useQuery } from '@tanstack/react-query'

export function useBoostSubscription(floqId: string) {
  return useQuery({
    queryKey: ['boost-subscription', floqId],
    queryFn: () => ({ isSubscribed: false })
  })
}