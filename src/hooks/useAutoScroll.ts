import { useRef, useEffect, useCallback } from 'react'

interface UseAutoScrollOptions {
  threshold?: number
  scrollSpeed?: number
  enabled?: boolean
}

export function useAutoScroll({ 
  threshold = 80, 
  scrollSpeed = 30, 
  enabled = true 
}: UseAutoScrollOptions = {}) {
  const containerRef = useRef<HTMLElement | null>(null)
  const animationFrameRef = useRef<number>()
  const isScrollingRef = useRef(false)

  const stopScrolling = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current)
      animationFrameRef.current = undefined
    }
    isScrollingRef.current = false
  }, [])

  const startScrolling = useCallback((direction: 'up' | 'down') => {
    if (!enabled || !containerRef.current || isScrollingRef.current) return

    isScrollingRef.current = true
    
    const scroll = () => {
      if (!containerRef.current || !isScrollingRef.current) return

      const scrollAmount = direction === 'up' ? -scrollSpeed : scrollSpeed
      containerRef.current.scrollBy({
        top: scrollAmount,
        behavior: 'auto' // Use auto for smooth continuous scrolling
      })

      animationFrameRef.current = requestAnimationFrame(scroll)
    }

    scroll()
  }, [enabled, scrollSpeed])

  const handlePointerMove = useCallback((e: PointerEvent) => {
    if (!enabled || !containerRef.current) return

    const rect = containerRef.current.getBoundingClientRect()
    const pointerY = e.clientY - rect.top

    // Check if pointer is near top or bottom edge
    if (pointerY < threshold) {
      if (!isScrollingRef.current) {
        startScrolling('up')
      }
    } else if (pointerY > rect.height - threshold) {
      if (!isScrollingRef.current) {
        startScrolling('down')
      }
    } else {
      stopScrolling()
    }
  }, [enabled, threshold, startScrolling, stopScrolling])

  const handlePointerLeave = useCallback(() => {
    stopScrolling()
  }, [stopScrolling])

  useEffect(() => {
    const container = containerRef.current
    if (!container || !enabled) return

    container.addEventListener('pointermove', handlePointerMove)
    container.addEventListener('pointerleave', handlePointerLeave)

    return () => {
      container.removeEventListener('pointermove', handlePointerMove)
      container.removeEventListener('pointerleave', handlePointerLeave)
      stopScrolling()
    }
  }, [enabled, handlePointerMove, handlePointerLeave, stopScrolling])

  const setContainer = useCallback((element: HTMLElement | null) => {
    containerRef.current = element
  }, [])

  return {
    setContainer,
    stopScrolling
  }
}