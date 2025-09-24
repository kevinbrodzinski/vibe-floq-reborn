import React from 'react';
import { Pressable, View, StyleSheet, Platform } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { useFieldHeartbeat } from '@/hooks/useFieldHeartbeat';

export type SocialBatteryIconProps = {
  onPress?: () => void;
  size?: number;
  accent?: string;
  surface?: string;
  border?: string;
  envelope?: 'strict'|'balanced'|'permissive';
  level?: number; // optional override
};

export function SocialBatteryIcon({ onPress, size=28, accent='hsl(var(--primary))', surface='hsl(var(--background))', border='hsl(var(--border))', envelope='balanced', level }: SocialBatteryIconProps) {
  const hb = useFieldHeartbeat({ envelope });
  const energy = level != null ? Math.max(0, Math.min(1, level/100)) : Math.max(0, Math.min(1, hb?.energy ?? 0.5));
  const stroke = Math.max(2, Math.floor(size/10));
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = `${c * energy}, ${c}`;

  return (
    <Pressable onPress={onPress} accessibilityRole="button" accessibilityLabel={`Social battery ${Math.round(energy*100)} percent`}
      style={[styles.wrap, { width:size+12, height:size+12, backgroundColor:surface, borderColor:border }]}>
      <View pointerEvents="none">
        <Svg width={size} height={size}>
          <Circle cx={size/2} cy={size/2} r={r} stroke={accent} strokeOpacity={0.18} strokeWidth={stroke} fill="none"/>
          <Circle cx={size/2} cy={size/2} r={r} stroke={accent} strokeWidth={stroke} fill="none" strokeDasharray={dash} strokeLinecap="round" transform={`rotate(-90 ${size/2} ${size/2})`}/>
        </Svg>
      </View>
    </Pressable>
  );
}
const styles = StyleSheet.create({ wrap:{ alignItems:'center', justifyContent:'center', borderRadius:999, borderWidth:1 }});