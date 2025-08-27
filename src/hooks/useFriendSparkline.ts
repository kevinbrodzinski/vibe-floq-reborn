import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { Database } from '@/integrations/supabase/types'
import { useCurrentUserId } from '@/hooks/useCurrentUser'

type SparkRow = { day: string | null; shared_hours: number | null }

export const useFriendSparkline = (friendId: string | null) => {
  const currentProfileId = useCurrentUserId()

  return useQuery<[number, number][]>({
    queryKey: ['friend-sparkline', currentProfileId, friendId],
    enabled: !!friendId && !!currentProfileId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('v_friend_sparkline')
        .select('day, shared_hours')
        .eq('current_profile_id', currentProfileId! as any)
        .eq('other_profile_id', friendId! as any)
        .order('day', { ascending: true })
        .returns<SparkRow[]>()

      if (error) throw error
      // Map to [index, value] pairs; guard nulls
      return (data ?? []).map((row, i) => [i, row.shared_hours ?? 0])
    },
  })
}