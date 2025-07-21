import { useGesture } from '@use-gesture/react'
import { useRef } from 'react'
import { useDragFeedback } from './useDragFeedback'

interface SwipeGesturesOptions {
  onSwipeLeft?: () => void
  onSwipeRight?: () => void
  onSwipeUp?: () => void
  onSwipeDown?: () => void
  threshold?: number
  hapticFeedback?: boolean
}

export function useSwipeGestures({
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  threshold = 50,
  hapticFeedback = true
}: SwipeGesturesOptions) {
  const elementRef = useRef<HTMLElement>(null)
  const dragFeedback = useDragFeedback()

  const bind = useGesture({
    onDrag: ({ movement: [mx, my], direction: [dx, dy], distance, cancel, last }) => {
      // Cancel if distance is too small
      if (typeof distance === 'number' && distance < threshold) return

      // Only trigger on final movement
      if (!last) return

      const isHorizontal = Math.abs(mx) > Math.abs(my)
      
      if (isHorizontal) {
        if (dx > 0 && onSwipeRight) {
          if (hapticFeedback) dragFeedback.triggerDragEnd(true)
          onSwipeRight()
          cancel()
        } else if (dx < 0 && onSwipeLeft) {
          if (hapticFeedback) dragFeedback.triggerDragEnd(true)
          onSwipeLeft()
          cancel()
        }
      } else {
        if (dy > 0 && onSwipeDown) {
          if (hapticFeedback) dragFeedback.triggerDragEnd(true)
          onSwipeDown()
          cancel()
        } else if (dy < 0 && onSwipeUp) {
          if (hapticFeedback) dragFeedback.triggerDragEnd(true)
          onSwipeUp()
          cancel()
        }
      }
    }
  }, {
    drag: {
      threshold,
      filterTaps: true,
      preventScroll: false
    }
  })

  return {
    bind,
    elementRef
  }
}