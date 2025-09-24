import { useRef, useEffect, useCallback } from 'react'

/**
 * Stable timeout utility to prevent eslint exhaustive-deps issues
 */
export function useStableTimeout() {
  const ref = useRef<ReturnType<typeof setTimeout>>()

  const clear = useCallback(() => {
    if (ref.current) clearTimeout(ref.current)
  }, [])

  const start = useCallback((fn: () => void, ms: number) => {
    clear()
    ref.current = setTimeout(fn, ms)
  }, [clear])

  useEffect(() => clear, [clear])
  
  return { start, clear }
}