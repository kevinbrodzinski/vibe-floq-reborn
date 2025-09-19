import React, { useMemo, useEffect } from 'react';
import { View, Text, Pressable, Animated, StyleSheet } from 'react-native';
import { TrendingUp, TrendingDown, Minus } from 'lucide-react';
import Ring from './shapes/Ring';
import Bolt from './shapes/Bolt';
import Droplet from './shapes/Droplet';
import Sparks from './Sparks';
import { useFieldHeartbeat } from '@/hooks/useFieldHeartbeat';

type Dir = 'rising'|'stable'|'falling';

export default function MetamorphBattery({
  size = 52,
  envelope = 'balanced',
  onPress,
}:{
  size?: number;
  envelope?: 'strict'|'balanced'|'permissive';
  onPress?: () => void;
}) {
  const hb = useFieldHeartbeat({ envelope });
  const energy = Math.max(0, Math.min(1, hb?.energy ?? 0.5));
  const slope = hb?.slope ?? 0;
  const dir: Dir = slope > 0.02 ? 'rising' : slope < -0.02 ? 'falling' : 'stable';
  const lowPower = energy < 0.12;

  const pct = Math.round(energy*100);
  const scale = useBreath(dir, energy);
  const form = useMemo(() => dir, [dir]);

  // Energy-based styling
  const energyColor = useMemo(() => {
    if (energy > 0.7) return 'hsl(var(--primary))';
    if (energy > 0.3) return 'hsl(45, 100%, 60%)';
    return 'hsl(0, 70%, 60%)';
  }, [energy]);

  const TrendIcon = dir === 'rising' ? TrendingUp : dir === 'falling' ? TrendingDown : Minus;

  return (
    <Pressable
      onPress={onPress}
      style={styles.container}
      accessibilityRole="button"
      accessibilityLabel={`Energy ${pct} percent, ${dir}`}
    >
      <Animated.View style={{ transform:[{ scale }] }}>
        <View style={{ width:size, height:size }}>
          {form === 'rising' && (
            <>
              <Bolt size={size} energy01={energy} accent={energyColor}/>
              <Sparks size={size} accent={energyColor}/>
            </>
          )}
          {form === 'falling' && <Droplet size={size} energy01={energy} accent={energyColor}/>}
          {form === 'stable' && <Ring size={size} energy01={energy} accent={energyColor} showCrack={lowPower}/>}
        </View>
      </Animated.View>

      {/* Status Pills */}
      <View style={styles.statusContainer}>
        <View style={styles.statusRow}>
          <Text style={[styles.percentage, { color: energyColor }]}>{pct}%</Text>
          <TrendIcon 
            size={12}
            color={energyColor}
          />
        </View>
        <Text style={styles.direction}>{dir}</Text>
      </View>
    </Pressable>
  );
}

function useBreath(dir: Dir, energy: number) {
  const v = useMemo(() => new Animated.Value(1), []);
  useEffect(() => {
    const to = dir === 'rising' ? 1.02 : dir === 'falling' ? 0.995 : (energy>0.66 ? 1.01 : 1.005);
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(v, { toValue: to, duration: 1400, useNativeDriver: true }),
        Animated.timing(v, { toValue: 1,  duration: 1400, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => { loop.stop(); v.setValue(1); };
  }, [dir, energy, v]);
  return v;
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 8,
  },
  statusContainer: {
    flexDirection: 'column',
    alignItems: 'flex-start',
    gap: 4,
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  percentage: {
    fontSize: 14,
    fontWeight: '600',
  },
  direction: {
    fontSize: 12,
    color: 'hsl(var(--muted-foreground))',
    textTransform: 'capitalize',
  },
});