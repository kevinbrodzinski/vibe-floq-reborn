import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'
import type { Database } from '@/integrations/supabase/types'

type PlanStatus = Database['public']['Enums']['plan_status_enum']

interface PlanSummary {
  id: string
  title: string
  planned_at: string
  status: PlanStatus
  vibe_tag: string | null
  participant_count: number
  stops_count: number
}

interface PlanStats {
  draft: number
  finalized: number
  executing: number
  completed: number
  cancelled: number
}

interface PlansGrouped {
  draft: PlanSummary[]
  finalized: PlanSummary[]
  executing: PlanSummary[]
  completed: PlanSummary[]
  cancelled: PlanSummary[]
}

// Optimized hook with better caching and progressive loading
export function useOptimizedUserPlans() {
  const { data, isLoading, error: queryError } = useQuery({
    queryKey: ['optimized-user-plans'],
    staleTime: 5 * 60 * 1000, // 5 minutes - increased from 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes - increased from 5 minutes
    queryFn: async () => {
      console.time('User Plans Query');
      
      // Simplified query to fetch only essential data
      const { data, error } = await supabase
        .from('v_user_plans')
        .select('plan_id, title, starts_at, status, vibe_tag')
        .order('starts_at', { ascending: true })
        .throwOnError();
      
      console.timeEnd('User Plans Query');
      return data || [];
    },
  })

  // Process data efficiently
  const plansByStatus: PlansGrouped = {
    draft: [],
    finalized: [],
    executing: [],
    completed: [],
    cancelled: [],
  }

  const stats: PlanStats = {
    draft: 0,
    finalized: 0,
    executing: 0,
    completed: 0,
    cancelled: 0,
  }

  if (data) {
    data.forEach((plan: any) => {
      const status = plan.status || 'draft'
      if (status in plansByStatus) {
        const planSummary: PlanSummary = {
          id: plan.plan_id,
          title: plan.title,
          planned_at: plan.starts_at,
          status: status,
          vibe_tag: plan.vibe_tag,
          participant_count: 1, // Default for now
          stops_count: 0 // Default for now
        };
        plansByStatus[status as keyof PlansGrouped].push(planSummary)
        stats[status as keyof PlanStats]++
      }
    })
  }

  return {
    plansByStatus,
    stats,
    isLoading,
    error: queryError,
    plans: data || [],
  }
}