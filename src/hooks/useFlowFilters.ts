import { useState, useEffect, useCallback } from 'react'
import type { FlowFilters } from '@/lib/flow/types'

const FILTERS_STORAGE_KEY = 'floq:flow-filters:v1'

const DEFAULT_FILTERS: FlowFilters = {
  friendFlows: true,
  weatherPref: [],
  clusterDensity: 'normal'
}

/**
 * Hook for Flow Explore filters with localStorage persistence
 */
export function useFlowFilters(initialFilters?: FlowFilters) {
  const [filters, setFiltersState] = useState<FlowFilters>(() => {
    if (typeof window === 'undefined') return initialFilters || DEFAULT_FILTERS
    
    try {
      const stored = localStorage.getItem(FILTERS_STORAGE_KEY)
      if (stored) {
        const parsed = JSON.parse(stored)
        return { ...DEFAULT_FILTERS, ...parsed }
      }
    } catch (error) {
      console.warn('[useFlowFilters] Failed to load filters from localStorage:', error)
    }
    
    return initialFilters || DEFAULT_FILTERS
  })

  // Persist to localStorage whenever filters change
  useEffect(() => {
    if (typeof window === 'undefined') return
    
    try {
      localStorage.setItem(FILTERS_STORAGE_KEY, JSON.stringify(filters))
    } catch (error) {
      console.warn('[useFlowFilters] Failed to save filters to localStorage:', error)
    }
  }, [filters])

  const setFilters = useCallback((newFilters: FlowFilters | ((prev: FlowFilters) => FlowFilters)) => {
    setFiltersState(prev => {
      const next = typeof newFilters === 'function' ? newFilters(prev) : newFilters
      return { ...DEFAULT_FILTERS, ...next }
    })
  }, [])

  const resetFilters = useCallback(() => {
    setFilters(DEFAULT_FILTERS)
  }, [setFilters])

  return {
    filters,
    setFilters,
    resetFilters
  }
}