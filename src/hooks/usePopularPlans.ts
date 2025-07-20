import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import { z } from 'zod'

const PopularPlanSchema = z.object({
  id: z.string(),
  title: z.string(),
  starts_at: z.string(),
  vibe_tag: z.string().nullable(),
  participant_count: z.number(),
  creator: z.object({
    id: z.string(),
    display_name: z.string().nullable(),
    username: z.string().nullable(),
    avatar_url: z.string().nullable()
  })
})

export function usePopularPlans(limit = 10) {
  return useQuery({
    queryKey: ['popular-plans', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('floq_plans')
        .select(`
          id,
          title,
          starts_at,
          vibe_tag,
          creator:profiles(id, display_name, username, avatar_url),
          participant_count
        `)
        .order('participant_count', { ascending: false })
        .limit(limit)
        .eq('status', 'finalized')

      if (error) throw error
      const parsed = z.array(PopularPlanSchema).safeParse(data)
      if (!parsed.success) throw parsed.error

      return parsed.data
    },
    staleTime: 1000 * 60 * 5
  })
}