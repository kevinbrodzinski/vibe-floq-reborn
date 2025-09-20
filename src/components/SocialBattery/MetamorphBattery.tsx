import React, { useMemo, useEffect } from 'react';
import { View, Text, StyleSheet, Pressable, Animated, Platform } from 'react-native';
import Ring from './shapes/Ring';
import Bolt from './shapes/Bolt';
import Droplet from './shapes/Droplet';
import Sparks from './Sparks';
import SparkTrail from './SparkTrail';
import { useFieldHeartbeat } from '@/hooks/useFieldHeartbeat';

type Dir = 'rising'|'stable'|'falling';

export default function MetamorphBattery({
  size = 52,
  accent = 'var(--color-primary)',
  surface = 'var(--surface-glass)',
  onPrimary = 'var(--on-surface)',
  border = 'var(--border-muted)',
  envelope = 'balanced',
  onPress,
  showText = true,
}:{
  size?: number;
  accent?: string;
  surface?: string;
  onPrimary?: string;
  border?: string;
  envelope?: 'strict'|'balanced'|'permissive';
  onPress?: () => void;
  showText?: boolean;
}) {
  const hb = useFieldHeartbeat({ envelope });
  const energy = Math.max(0, Math.min(1, hb?.energy ?? 0.5));
  const slope  = hb?.slope ?? 0;
  const dir: Dir = slope > 0.02 ? 'rising' : slope < -0.02 ? 'falling' : 'stable';
  const lowPower = energy < 0.12;

  const pct = Math.round(energy*100);
  const scale = useBreath(dir, energy);
  const form = useMemo(() => dir, [dir]);

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.wrap,
        { backgroundColor: surface, borderColor: border },
      ]}
      accessibilityRole="button"
      accessibilityLabel={`Energy ${pct} percent, ${dir}`}
      hitSlop={{ top:8, right:8, bottom:8, left:8 }}
    >
      <Animated.View style={{ transform:[{ scale }] }}>
        <View style={{ width:size, height:size }}>
          {form === 'rising' && (
            <>
              <Bolt size={size} energy01={energy} accent={accent}/>
              <Sparks size={size} accent={accent}/>
              <SparkTrail size={size} accent={accent}/>
            </>
          )}
          {form === 'falling' && <Droplet size={size} energy01={energy} accent={accent}/>}
          {form === 'stable'  && <Ring size={size} energy01={energy} accent={accent} showCrack={lowPower}/>}
        </View>
      </Animated.View>

      {showText && (
        <View style={styles.right}>
          <Text style={[styles.pct, { color: accent }]}>{pct}%</Text>
          <Text style={[styles.hint, { color: withAlpha(onPrimary, 0.85) }]} numberOfLines={1}>
            {dir === 'rising' ? 'Good now' : dir === 'falling' ? 'Keep it short' : 'Dialed in'}
          </Text>
        </View>
      )}
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

function withAlpha(hexOrVar: string, alpha: number) {
  if (hexOrVar.startsWith?.('var(')) return hexOrVar;
  const h = hexOrVar.replace('#','');
  const n = h.length === 3 ? h.split('').map(x=>x+x).join('') : h.padEnd(6,'0').slice(0,6);
  const a = Math.round(Math.max(0,Math.min(1,alpha))*255).toString(16).padStart(2,'0');
  return `#${n}${a}`;
}

const styles = StyleSheet.create({
  wrap: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderRadius: 12,
    borderWidth: 1,
  },
  pct: { fontSize: 12, fontWeight: '800' },
  hint: { fontSize: 11, fontWeight: '600' },
  right: { marginLeft: 8, minWidth: 68, flexShrink: 1 },
});