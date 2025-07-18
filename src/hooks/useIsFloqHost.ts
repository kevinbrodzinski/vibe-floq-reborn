import { useSession } from '@supabase/auth-helpers-react'
import { useMemo } from 'react'

/**
 * Returns true when the signed-in user is the creator of the floq.
 * Pass in *either* FloqDetails *or* an object with creator_id / is_creator.
 */
export function useIsFloqHost(
  details?: { creator_id?: string | null; is_creator?: boolean | null }
) {
  const session = useSession()

  return useMemo(() => {
    if (!details) return false
    const sessionId = session?.user?.id
    return details.creator_id === sessionId || !!details.is_creator
  }, [details?.creator_id, details?.is_creator, session?.user?.id])
}