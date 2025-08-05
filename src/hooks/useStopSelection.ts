import { useState, useCallback } from 'react'
import type { PlanStop } from '@/types/plan'

export function useStopSelection() {
  const [selectedStops, setSelectedStops] = useState<Set<string>>(new Set())

  const toggleSelection = useCallback((stopId: string, isMultiSelect = false) => {
    setSelectedStops(prev => {
      const newSet = new Set(prev)
      
      if (!isMultiSelect) {
        newSet.clear()
      }
      
      if (prev.has(stopId)) {
        newSet.delete(stopId)
      } else {
        newSet.add(stopId)
      }
      
      return newSet
    })
  }, [])

  const selectRange = useCallback((fromStopId: string, toStopId: string, stops: PlanStop[]) => {
    const fromIndex = stops.findIndex(stop => stop.id === fromStopId)
    const toIndex = stops.findIndex(stop => stop.id === toStopId)
    
    if (fromIndex === -1 || toIndex === -1) return

    const start = Math.min(fromIndex, toIndex)
    const end = Math.max(fromIndex, toIndex)
    
    setSelectedStops(prev => {
      const newSet = new Set(prev)
      for (let i = start; i <= end; i++) {
        newSet.add(stops[i].id)
      }
      return newSet
    })
  }, [])

  const selectAll = useCallback((stops: PlanStop[]) => {
    setSelectedStops(new Set(stops.map(stop => stop.id)))
  }, [])

  const clearSelection = useCallback(() => {
    setSelectedStops(new Set())
  }, [])

  const bulkDelete = useCallback((stops: PlanStop[], onDelete: (stopId: string) => void) => {
    selectedStops.forEach(stopId => {
      onDelete(stopId)
    })
    clearSelection()
  }, [selectedStops, clearSelection])

  const bulkMove = useCallback((newTime: string, onMove: (stopId: string, newTime: string) => void) => {
    selectedStops.forEach(stopId => {
      onMove(stopId, newTime)
    })
    clearSelection()
  }, [selectedStops, clearSelection])

  const bulkDuplicate = useCallback((onDuplicate: (stopId: string) => void) => {
    selectedStops.forEach(stopId => {
      onDuplicate(stopId)
    })
    clearSelection()
  }, [selectedStops, clearSelection])

  return {
    selectedStops,
    toggleSelection,
    selectRange,
    selectAll,
    clearSelection,
    bulkDelete,
    bulkMove,
    bulkDuplicate,
    hasSelection: selectedStops.size > 0
  }
}