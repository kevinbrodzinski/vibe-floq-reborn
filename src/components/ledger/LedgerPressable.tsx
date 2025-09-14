import React from 'react';
import { Pressable, PressableProps } from 'react-native';

/**
 * React Native pressable wrapper that captures navigation timing
 * Use this for navigation buttons to measure tap→screen latency
 */
export function LedgerPressable(props: PressableProps & { onEmit?: () => void }) {
  const { onEmit, onPress, ...rest } = props;
  
  return (
    <Pressable
      {...rest}
      onPress={(e) => {
        (global as any).__nav_t0 = Date.now();
        onEmit?.();
        onPress?.(e);
      }}
    />
  );
}