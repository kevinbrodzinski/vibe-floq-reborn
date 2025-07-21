import { useCallback } from 'react'
import { Haptics, ImpactStyle, NotificationType } from '@capacitor/haptics'

export interface DragFeedbackOptions {
  enableHaptics?: boolean
  enableSoundFeedback?: boolean
}

export function useDragFeedback(options: DragFeedbackOptions = {}) {
  const { enableHaptics = true, enableSoundFeedback = false } = options

  const triggerDragStart = useCallback(async () => {
    if (enableHaptics) {
      try {
        await Haptics.selectionStart()
      } catch (error) {
        // Silently ignore haptics errors (not available on all platforms)
      }
    }
  }, [enableHaptics])

  const triggerDragMove = useCallback(async () => {
    if (enableHaptics) {
      try {
        await Haptics.selectionChanged()
      } catch (error) {
        // Silently ignore haptics errors
      }
    }
  }, [enableHaptics])

  const triggerDragEnd = useCallback(async (success: boolean = true) => {
    if (enableHaptics) {
      try {
        if (success) {
          await Haptics.selectionEnd()
        } else {
          await Haptics.notification({ type: NotificationType.Error })
        }
      } catch (error) {
        // Silently ignore haptics errors
      }
    }
  }, [enableHaptics])

  const triggerDropZoneEnter = useCallback(async () => {
    if (enableHaptics) {
      try {
        await Haptics.impact({ style: ImpactStyle.Light })
      } catch (error) {
        // Silently ignore haptics errors
      }
    }
  }, [enableHaptics])

  const triggerDropZoneLeave = useCallback(async () => {
    if (enableHaptics) {
      try {
        await Haptics.impact({ style: ImpactStyle.Light })
      } catch (error) {
        // Silently ignore haptics errors
      }
    }
  }, [enableHaptics])

  return {
    triggerDragStart,
    triggerDragMove,
    triggerDragEnd,
    triggerDropZoneEnter,
    triggerDropZoneLeave,
  }
}