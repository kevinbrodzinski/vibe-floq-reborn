import { useCallback } from 'react'
import { type PlanStatus } from '@/types/enums/planStatus'

interface StatusTransitionRule {
  from: PlanStatus
  to: PlanStatus
  requiresConfirmation: boolean
  requiresPermission: 'creator' | 'participant' | 'any'
  validationRules?: string[]
}

interface PlanValidationContext {
  hasParticipants: boolean
  isCreator: boolean
  hasStops: boolean
  isActive: boolean
}

export function usePlanStatusValidation() {
  // Define the complete status transition matrix
  const transitionRules: StatusTransitionRule[] = [
    // Draft transitions
    { from: 'draft', to: 'active', requiresConfirmation: false, requiresPermission: 'creator' },
    { from: 'draft', to: 'finalized', requiresConfirmation: false, requiresPermission: 'creator', validationRules: ['has_stops'] },
    { from: 'draft', to: 'cancelled', requiresConfirmation: true, requiresPermission: 'creator' },
    
    // Active transitions
    { from: 'active', to: 'finalized', requiresConfirmation: false, requiresPermission: 'creator' },
    { from: 'active', to: 'executing', requiresConfirmation: false, requiresPermission: 'creator' },
    { from: 'active', to: 'closed', requiresConfirmation: true, requiresPermission: 'creator' },
    { from: 'active', to: 'cancelled', requiresConfirmation: true, requiresPermission: 'creator' },
    
    // Finalized transitions
    { from: 'finalized', to: 'executing', requiresConfirmation: true, requiresPermission: 'creator' },
    { from: 'finalized', to: 'cancelled', requiresConfirmation: true, requiresPermission: 'creator' },
    
    // Executing transitions
    { from: 'executing', to: 'completed', requiresConfirmation: true, requiresPermission: 'creator' },
    { from: 'executing', to: 'cancelled', requiresConfirmation: true, requiresPermission: 'creator' },
    
    // Closed transitions
    { from: 'closed', to: 'active', requiresConfirmation: false, requiresPermission: 'creator' },
    
    // Completed/Cancelled are terminal states - no transitions allowed
  ]

  const validateTransition = useCallback((
    from: PlanStatus,
    to: PlanStatus,
    context: PlanValidationContext
  ): { isValid: boolean; reason?: string; requiresConfirmation: boolean } => {
    // Find the transition rule
    const rule = transitionRules.find(r => r.from === from && r.to === to)
    
    if (!rule) {
      return { 
        isValid: false, 
        reason: `Invalid transition from ${from} to ${to}`,
        requiresConfirmation: false
      }
    }

    // Check permissions
    if (rule.requiresPermission === 'creator' && !context.isCreator) {
      return {
        isValid: false,
        reason: 'Only the plan creator can perform this action',
        requiresConfirmation: false
      }
    }

    // Validate specific rules
    if (rule.validationRules) {
      for (const ruleKey of rule.validationRules) {
        switch (ruleKey) {
          case 'has_stops':
            if (!context.hasStops) {
              return {
                isValid: false,
                reason: 'Plan must have at least one stop before finalizing',
                requiresConfirmation: false
              }
            }
            break
          case 'has_participants':
            if (!context.hasParticipants) {
              return {
                isValid: false,
                reason: 'Plan must have participants',
                requiresConfirmation: false
              }
            }
            break
          case 'is_active':
            if (!context.isActive) {
              return {
                isValid: false,
                reason: 'Plan is no longer active',
                requiresConfirmation: false
              }
            }
            break
        }
      }
    }

    return {
      isValid: true,
      requiresConfirmation: rule.requiresConfirmation
    }
  }, [])

  const getAvailableTransitions = useCallback((
    currentStatus: PlanStatus,
    context: PlanValidationContext
  ): Array<{ status: PlanStatus; label: string; requiresConfirmation: boolean }> => {
    const available = transitionRules
      .filter(rule => rule.from === currentStatus)
      .map(rule => {
        const validation = validateTransition(currentStatus, rule.to, context)
        return {
          status: rule.to,
          label: getStatusActionLabel(rule.to),
          requiresConfirmation: rule.requiresConfirmation,
          isValid: validation.isValid,
          reason: validation.reason
        }
      })
      .filter(item => item.isValid)

    return available
  }, [validateTransition])

  const getStatusActionLabel = (status: PlanStatus): string => {
    const labels: Record<PlanStatus, string> = {
      draft: 'Save as Draft',
      active: 'Activate Plan', 
      closed: 'Close Plan',
      finalized: 'Finalize Plan',
      executing: 'Start Execution',
      completed: 'Complete Plan',
      cancelled: 'Cancel Plan',
      invited: 'Invite to Plan'
    }
    return labels[status]
  }

  const getStatusDescription = (status: PlanStatus): string => {
    const descriptions: Record<PlanStatus, string> = {
      draft: 'Plan is being created and can be edited freely',
      active: 'Plan is active and ready for participants',
      closed: 'Plan is closed for new activity',
      finalized: 'Plan is locked and ready for execution',
      executing: 'Plan is currently being executed',
      completed: 'Plan has been successfully completed',
      cancelled: 'Plan has been cancelled and cannot be restarted',
      invited: 'Plan invitation is pending response'
    }
    return descriptions[status]
  }

  const isTerminalStatus = (status: PlanStatus): boolean => {
    return status === 'completed' || status === 'cancelled' || status === 'closed'
  }

  const canEditPlan = (status: PlanStatus): boolean => {
    return status === 'draft' || status === 'active'
  }

  const canVoteOnStops = (status: PlanStatus): boolean => {
    return status === 'active' || status === 'finalized' || status === 'executing'
  }

  return {
    validateTransition,
    getAvailableTransitions,
    getStatusActionLabel,
    getStatusDescription,
    isTerminalStatus,
    canEditPlan,
    canVoteOnPlan: canVoteOnStops,  // alias for backward compatibility
    canVoteOnStops
  }
}