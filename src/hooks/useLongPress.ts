import { useAdvancedGestures } from './useAdvancedGestures';
import { useHapticFeedback } from './useHapticFeedback';

interface UseLongPressProps {
  onLongPress: () => void;
  delay?: number;
}

export function useLongPress({ onLongPress, delay = 800 }: UseLongPressProps) {
  const { socialHaptics } = useHapticFeedback();
  
  const gestures = useAdvancedGestures({
    longPressDelay: delay,
    onTap: () => {
      // Handle tap normally
    },
    onGesture: (gesture) => {
      if (gesture.type === 'long-press') {
        socialHaptics.longPressActivated();
        onLongPress();
      }
    }
  });

  return gestures;
}