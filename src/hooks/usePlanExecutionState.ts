import { useState, useEffect, useCallback } from 'react'
import { usePlanStops } from './usePlanStops'

interface PlanExecutionState {
  currentStopIndex: number
  afterglowStarted: boolean
  reflectionSubmitted: boolean
  isExecutionComplete: boolean
  currentStop?: any
  nextStop?: any
  progress: number
}

export function usePlanExecutionState(planId: string) {
  const { data: stops = [] } = usePlanStops(planId)
  
  const [state, setState] = useState<PlanExecutionState>({
    currentStopIndex: 0,
    afterglowStarted: false,
    reflectionSubmitted: false,
    isExecutionComplete: false,
    progress: 0,
  })

  // Load state from localStorage on mount
  useEffect(() => {
    const savedState = localStorage.getItem(`plan-execution-${planId}`)
    if (savedState) {
      try {
        const parsed = JSON.parse(savedState)
        setState(prev => ({
          ...prev,
          ...parsed,
        }))
      } catch (error) {
        console.error('Error parsing saved execution state:', error)
      }
    }
  }, [planId])

  // Save state to localStorage whenever it changes
  useEffect(() => {
    localStorage.setItem(`plan-execution-${planId}`, JSON.stringify(state))
  }, [planId, state])

  // Calculate derived values
  const currentStop = stops[state.currentStopIndex]
  const nextStop = stops[state.currentStopIndex + 1]
  const progress = stops.length > 0 ? ((state.currentStopIndex + 1) / stops.length) * 100 : 0
  const isExecutionComplete = state.currentStopIndex >= stops.length - 1

  // Actions
  const advanceToNextStop = useCallback(() => {
    if (state.currentStopIndex < stops.length - 1) {
      setState(prev => ({
        ...prev,
        currentStopIndex: prev.currentStopIndex + 1,
      }))
    }
  }, [state.currentStopIndex, stops.length])

  const setCurrentStopIndex = useCallback((index: number) => {
    setState(prev => ({
      ...prev,
      currentStopIndex: Math.max(0, Math.min(index, stops.length - 1)),
    }))
  }, [stops.length])

  const startAfterglow = useCallback(() => {
    setState(prev => ({
      ...prev,
      afterglowStarted: true,
    }))
  }, [])

  const submitReflection = useCallback(() => {
    setState(prev => ({
      ...prev,
      reflectionSubmitted: true,
    }))
  }, [])

  const resetExecution = useCallback(() => {
    setState({
      currentStopIndex: 0,
      afterglowStarted: false,
      reflectionSubmitted: false,
      isExecutionComplete: false,
      progress: 0,
    })
    localStorage.removeItem(`plan-execution-${planId}`)
  }, [planId])

  const snoozeAfterglow = useCallback((minutes: number) => {
    setState(prev => ({
      ...prev,
      afterglowStarted: false,
    }))
    
    // Set timeout to restart afterglow after specified minutes
    setTimeout(() => {
      setState(prev => ({
        ...prev,
        afterglowStarted: true,
      }))
    }, minutes * 60 * 1000)
  }, [])

  return {
    // State
    currentStopIndex: state.currentStopIndex,
    afterglowStarted: state.afterglowStarted,
    reflectionSubmitted: state.reflectionSubmitted,
    isExecutionComplete,
    currentStop,
    nextStop,
    progress,
    
    // Actions
    advanceToNextStop,
    setCurrentStopIndex,
    startAfterglow,
    submitReflection,
    resetExecution,
    snoozeAfterglow,
  }
}