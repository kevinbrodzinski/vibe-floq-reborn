import type { PlanStatus } from '@/types/enums/planStatus'

export interface EditablePlan {
  status?: PlanStatus | string
}

/**
 * Determines if a plan can be edited based on its status
 * Only draft plans are editable
 */
export const isPlanEditable = (plan?: EditablePlan): boolean => {
  if (!plan?.status) return true // Default to editable if no status
  return plan.status === 'draft'
}

/**
 * Get user-friendly message for why a plan can't be edited
 */
export const getPlanEditRestrictionMessage = (plan?: EditablePlan): string => {
  if (!plan?.status) return ''
  
  switch (plan.status) {
    case 'finalized':
      return 'This plan is finalized and cannot be edited. Duplicate to make changes.'
    case 'executing':
      return 'This plan is currently being executed and cannot be edited.'
    case 'completed':
      return 'This plan is completed and cannot be edited.'
    case 'cancelled':
      return 'This plan is cancelled and cannot be edited.'
    default:
      return 'This plan cannot be edited.'
  }
}