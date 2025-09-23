import React from 'react';
import { View } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import Animated, { useSharedValue, withRepeat, withTiming, useAnimatedProps } from 'react-native-reanimated';
import { colors } from '@/lib/theme-tokens.native';

const ACircle = Animated.createAnimatedComponent(Circle);

type Props = {
  count?: number;
  hue?: number; // if provided, we synthesize hsla; else use primary
  color?: string; // token color wins over hue
  drift?: boolean; // enable subtle hue drift for "living" effect
};

export function ParticleField({ count = 12, hue, color, drift = false }: Props) {
  const seeds = React.useMemo(() => Array.from({ length: count }).map((_, i) => i), [count]);

  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 }}>
      {/* Fixed viewBox keeps math easy; render inside hero card bounds */}
      <Svg width="100%" height="100%" viewBox="0 0 320 200">
        {seeds.map((i) => (
          <Particle key={i} hue={hue} color={color} drift={drift} />
        ))}
      </Svg>
    </View>
  );
}

function Particle({ hue, color, drift = false }: { hue?: number; color?: string; drift?: boolean }) {
  const cx = useSharedValue(Math.random() * 320);
  const cy = useSharedValue(Math.random() * 200);
  const durX = 7000 + Math.random() * 4000;
  const durY = 7000 + Math.random() * 4000;

  React.useEffect(() => {
    cx.value = withRepeat(withTiming(Math.random() * 320, { duration: durX }), -1, true);
    cy.value = withRepeat(withTiming(Math.random() * 200, { duration: durY }), -1, true);
  }, []);

  const animated = useAnimatedProps(() => ({
    cx: cx.value,
    cy: cy.value,
  }));

  // Apply subtle drift to hue for "living" particles
  const useHue = hue != null && drift 
    ? hue + (Math.sin(Date.now() * 0.001) * 6) // ±6° drift
    : hue;
    
  const fill = color ?? (useHue != null ? `hsla(${useHue}, 75%, 65%, 0.7)` : colors.primary);

  return <ACircle animatedProps={animated} r={1 + Math.random() * 1.6} fill={fill} />;
}