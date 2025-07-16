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
  archived_at: string | null
  current_stop_id: string | null
  execution_started_at: string | null
  participant_count: number
  stops_count: number
}

interface PlanStats extends Record<PlanStatus, number> {
  draft: number
  active: number
  closed: number
  cancelled: number
}

interface PlansGrouped extends Record<PlanStatus, PlanSummary[]> {
  draft: PlanSummary[]
  active: PlanSummary[]
  closed: PlanSummary[]
  cancelled: PlanSummary[]
}

export function useUserPlans() {
  const { data, isLoading, error: queryError } = useQuery({
    queryKey: ['user-plans'],
    staleTime: 60 * 1000, // 1 minute
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
    active: [],
    closed: [],
    cancelled: [],
  }

  const stats: PlanStats = {
    draft: 0,
    active: 0,
    closed: 0,
    cancelled: 0,
  }

  if (data) {
    data.forEach((plan) => {
      const status = plan.status || 'draft'
      if (plansByStatus[status as PlanStatus]) {
        plansByStatus[status as PlanStatus].push(plan)
        stats[status as PlanStatus]++
      } else {
        console.warn(`Unknown plan status: ${status}`)
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