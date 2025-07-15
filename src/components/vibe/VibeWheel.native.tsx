import { memo } from 'react';
import { StyleSheet, View, Text, Platform } from 'react-native';
import { PanGestureHandler } from 'react-native-gesture-handler';
import Animated, {
  cancelAnimation,
  runOnJS,
  useAnimatedGestureHandler,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  withDecay,
  withSpring,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { useVibe, useCurrentVibe } from '@/lib/store/useVibe';
import { VIBE_ORDER, VIBE_COLORS, type VibeEnum } from '@/constants/vibes';

const SEGMENT = 360 / VIBE_ORDER.length;
const SPRING_CONFIG = { stiffness: 170, damping: 18, mass: 0.6 };

interface VibeWheelProps {
  size?: number;
  disabled?: boolean;
}

export const VibeWheel = memo(({ size = 280, disabled = false }: VibeWheelProps) => {
  const setVibe = useVibe((s) => s.setVibe);
  const current = useCurrentVibe() ?? VIBE_ORDER[0];

  const theta = useSharedValue(VIBE_ORDER.indexOf(current) * SEGMENT);
  const dragging = useSharedValue(false);

  useDerivedValue(() => {
    const target = VIBE_ORDER.indexOf(current) * SEGMENT;
    if (!dragging.value) {
      theta.value = withSpring(target, SPRING_CONFIG);
    }
  }, [current]);

  const pan = useAnimatedGestureHandler({
    onStart: (_, ctx) => {
      if (disabled) return;
      ctx.start = theta.value;
      dragging.value = true;
      cancelAnimation(theta);
    },
    onActive: (e, ctx) => {
      if (disabled) return;
      theta.value = ctx.start + e.translationX * 0.5;
    },
    onEnd: (e) => {
      if (disabled) {
        dragging.value = false;
        return;
      }
      
      const decay = withDecay({
        velocity: e.velocityX * 0.5,
        clamp: [Number.NEGATIVE_INFINITY, Number.POSITIVE_INFINITY],
      });
      
      theta.value = decay;
      theta.value = withSpring(
        Math.round(theta.value / SEGMENT) * SEGMENT,
        SPRING_CONFIG,
        (finished) => {
          if (finished) {
            const idx = ((Math.round(theta.value / SEGMENT) % VIBE_ORDER.length)
                        + VIBE_ORDER.length) % VIBE_ORDER.length;
            const vibe = VIBE_ORDER[idx];
            runOnJS(triggerSnap)(vibe);
          }
          dragging.value = false;
        }
      );
    },
  });

  const triggerSnap = (vibe: VibeEnum) => {
    if (vibe === current) return;
    
    try {
      if (Platform.OS !== 'web') {
        Haptics.selectionAsync();
      } else if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(10);
      }
    } catch (error) {
      // Silent fallback
    }
    
    setVibe(vibe);
  };

  const wheelStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${theta.value}deg` }],
  }));

  const glowStyle = useAnimatedStyle(() => {
    const rawIndex = theta.value / SEGMENT;
    const baseIdx = Math.floor((rawIndex % VIBE_ORDER.length + VIBE_ORDER.length) % VIBE_ORDER.length);
    const t = rawIndex - baseIdx;
    const c0 = VIBE_COLORS[VIBE_ORDER[baseIdx]];
    const c1 = VIBE_COLORS[VIBE_ORDER[(baseIdx + 1) % VIBE_ORDER.length]];
    
    return {
      backgroundColor: mixColor(t, c0, c1),
      opacity: dragging.value ? 0.6 : 0.35,
    };
  });

  const wheelSize = { width: size, height: size, borderRadius: size / 2 };

  return (
    <View style={[styles.container, { opacity: disabled ? 0.5 : 1 }]}>
      <PanGestureHandler onGestureEvent={pan} enabled={!disabled}>
        <Animated.View 
          style={[styles.wheel, wheelSize, wheelStyle]}
          accessibilityLabel={`Current vibe: ${current}`}
          accessibilityRole="adjustable"
        >
          <Animated.View style={[styles.glow, glowStyle]} />
          
          {VIBE_ORDER.map((vibe, index) => {
            const angle = index * SEGMENT;
            const isActive = vibe === current;
            
            return (
              <View
                key={vibe}
                style={[
                  styles.segment,
                  {
                    transform: [{ rotate: `${angle}deg` }],
                    backgroundColor: VIBE_COLORS[vibe],
                    opacity: isActive ? 1 : 0.7,
                  }
                ]}
              >
                <Text style={[styles.segmentText, { 
                  transform: [{ rotate: `${-angle}deg` }],
                  fontWeight: isActive ? '600' : '400'
                }]}>
                  {vibe}
                </Text>
              </View>
            );
          })}
          
          <View style={styles.center}>
            <View style={[styles.indicator, { backgroundColor: VIBE_COLORS[current] }]} />
          </View>
        </Animated.View>
      </PanGestureHandler>
    </View>
  );
});

function mixColor(t: number, c0: string, c1: string) {
  'worklet';
  const a = parseInt(c0.slice(1), 16);
  const b = parseInt(c1.slice(1), 16);
  const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
  const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
  const rr = Math.round(ar + (br - ar) * t);
  const gg = Math.round(ag + (bg - ag) * t);
  const bb2 = Math.round(ab + (bb - ab) * t);
  return `rgb(${rr},${gg},${bb2})`;
}

const styles = StyleSheet.create({
  container: { alignItems: 'center', justifyContent: 'center' },
  wheel: { position: 'relative', overflow: 'hidden', borderWidth: 3, borderColor: 'rgba(255, 255, 255, 0.2)' },
  glow: { ...StyleSheet.absoluteFillObject, borderRadius: 9999 },
  segment: { position: 'absolute', width: '50%', height: 4, top: '50%', left: '50%', transformOrigin: '0% 50%', justifyContent: 'center', alignItems: 'flex-end', paddingRight: 8 },
  segmentText: { color: 'white', fontSize: 12, textShadowColor: 'rgba(0, 0, 0, 0.5)', textShadowOffset: { width: 0, height: 1 }, textShadowRadius: 2, textTransform: 'capitalize' },
  center: { position: 'absolute', top: '50%', left: '50%', width: 20, height: 20, marginTop: -10, marginLeft: -10, borderRadius: 10, backgroundColor: 'white', justifyContent: 'center', alignItems: 'center', elevation: 3, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.25, shadowRadius: 4 },
  indicator: { width: 12, height: 12, borderRadius: 6 }
});

VibeWheel.displayName = 'VibeWheel';