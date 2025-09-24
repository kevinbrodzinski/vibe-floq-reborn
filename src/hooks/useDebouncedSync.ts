import { useCallback, useRef } from 'react'
import { debounce } from 'lodash'

export interface SyncFunction {
  (data: any): void | Promise<void>
}

export function useDebouncedSync(syncFn: SyncFunction, delay: number = 1000) {
  const debouncedSyncRef = useRef(
    debounce((data: any) => {
      syncFn(data)
    }, delay)
  )

  const syncChanges = useCallback((data: any) => {
    debouncedSyncRef.current(data)
  }, [])

  const syncImmediately = useCallback((data: any) => {
    debouncedSyncRef.current.cancel()
    syncFn(data)
  }, [syncFn])

  return {
    syncChanges,
    syncImmediately,
    cancelPendingSync: debouncedSyncRef.current.cancel
  }
}