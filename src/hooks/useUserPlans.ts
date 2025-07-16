import { useQuery } from '@tanstack/react-query'
import { supabase } from '@/integrations/supabase/client'

interface PlanSummary {
  id: string
  title: string
  planned_at: string
  status: 'draft' | 'finalized' | 'executing' | 'completed' | 'archived'
  vibe_tag: string | null
  archived_at: string | null
  current_stop_id: string | null
  execution_started_at: string | null
  participant_count: number
  stops_count: number
}

interface PlanStats {
  draft: number
  finalized: number
  executing: number
  completed: number
  archived: number
}

interface PlansGrouped {
  draft: PlanSummary[]
  finalized: PlanSummary[]
  executing: PlanSummary[]
  completed: PlanSummary[]
  archived: PlanSummary[]
}

export function useUserPlans() {
  const { data, isLoading, error } = useQuery({
    queryKey: ['user-plans'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_accessible_plans')
      
      if (error) {
        console.error('Failed to fetch user plans:', error)
        throw error
      }
      
      return (data || []) as PlanSummary[]
    },
  })

  // Group plans by status
  const plansByStatus: PlansGrouped = {
    draft: [],
    finalized: [],
    executing: [],
    completed: [],
    archived: [],
  }

  const stats: PlanStats = {
    draft: 0,
    finalized: 0,
    executing: 0,
    completed: 0,
    archived: 0,
  }

  if (data) {
    data.forEach((plan) => {
      const status = plan.status || 'draft'
      if (plansByStatus[status]) {
        plansByStatus[status].push(plan)
        stats[status]++
      }
    })
  }

  return {
    plansByStatus,
    stats,
    isLoading,
    error,
    plans: data || [],
  }
}

export function useUserPlansSummary() {
  return useQuery({
    queryKey: ['user-plans-summary'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_user_plans_summary')
      
      if (error) {
        console.error('Failed to fetch plans summary:', error)
        throw error
      }
      
      return data || []
    },
  })
}