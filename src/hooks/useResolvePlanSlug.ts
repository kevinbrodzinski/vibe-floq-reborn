import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

interface PlanResolution {
  type: 'slug' | 'plan_id'
  plan_id: string
  floq_id: string
  creator_id: string
  resolved_slug: string
}

export function useResolvePlanSlug(slugOrId?: string) {
  return useQuery<PlanResolution | null>({
    queryKey: ['resolve-plan-slug', slugOrId],
    enabled: !!slugOrId,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke<PlanResolution>(
        'resolve-plan-slug',
        { body: { slug: slugOrId } }
      )

      if (error) {
        console.warn('[useResolvePlanSlug] Failed to resolve:', error)
        return null
      }

      return data || null
    },
  })
}