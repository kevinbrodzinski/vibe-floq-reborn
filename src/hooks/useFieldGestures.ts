import { RefObject, useRef } from 'react';
import { useAdvancedGestures } from './useAdvancedGestures';
import { useAdvancedHaptics } from './useAdvancedHaptics';
import { useShakeDetection } from './useShakeDetection';
import { useMapViewport } from './useMapViewport';
import { useUserSettings } from './useUserSettings';
import { useFieldUI } from '@/components/field/contexts/FieldUIContext';
import { useLongPress } from './useLongPress';

export function useFieldGestures(canvasRef: RefObject<HTMLCanvasElement>) {
  const { zoomIn, zoomOut, resetZoom, inertiaZoom } = useMapViewport();
  const { settings } = useUserSettings();
  const { setConstellationMode } = useFieldUI();
  const { light, medium, heavy } = useAdvancedHaptics({ enabled: true });

  const gesturesEnabled = true; // Could be tied to settings later
  const hapticsEnabled = true;  // Could be tied to settings later

  // Basic gesture handling (tap for reset)
  const gestureHandlers = useAdvancedGestures({
    onTap: () => gesturesEnabled && resetZoom(),
    onGesture: (gesture) => {
      if (!gesturesEnabled) return;
      // Handle general gestures here if needed
    }
  });

  // Long-press handler for friend dots
  const longPressHandlers = useLongPress({
    onLongPress: () => {
      if (!gesturesEnabled) return;
      // This would need to be enhanced to detect friend dot context
      hapticsEnabled && medium();
    },
    delay: 500
  });

  // Shake-to-constellation
  useShakeDetection({
    onShake: () => {
      if (!gesturesEnabled) return;
      setConstellationMode(true);
      hapticsEnabled && heavy();
    },
    enabled: gesturesEnabled
  });

  // Return handlers that can be spread on the canvas container
  return {
    ...gestureHandlers.handlers,
    ...longPressHandlers.handlers
  };
}