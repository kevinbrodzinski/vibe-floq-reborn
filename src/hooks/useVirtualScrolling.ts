import { useState, useEffect, useCallback, useMemo } from 'react'

interface VirtualScrollingOptions {
  itemHeight: number
  containerHeight: number
  overscan?: number
}

export function useVirtualScrolling<T>(
  items: T[], 
  { itemHeight, containerHeight, overscan = 5 }: VirtualScrollingOptions
) {
  const [scrollTop, setScrollTop] = useState(0)

  const visibleRange = useMemo(() => {
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const visibleCount = Math.ceil(containerHeight / itemHeight)
    const endIndex = Math.min(
      items.length - 1, 
      startIndex + visibleCount + overscan * 2
    )

    return { startIndex, endIndex }
  }, [scrollTop, itemHeight, containerHeight, overscan, items.length])

  const visibleItems = useMemo(() => {
    return items.slice(visibleRange.startIndex, visibleRange.endIndex + 1)
      .map((item, index) => ({
        item,
        index: visibleRange.startIndex + index,
        style: {
          position: 'absolute' as const,
          top: (visibleRange.startIndex + index) * itemHeight,
          height: itemHeight,
          width: '100%'
        }
      }))
  }, [items, visibleRange, itemHeight])

  const totalHeight = items.length * itemHeight

  const handleScroll = useCallback((event: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(event.currentTarget.scrollTop)
  }, [])

  return {
    visibleItems,
    totalHeight,
    handleScroll,
    scrollTop,
    visibleRange
  }
}