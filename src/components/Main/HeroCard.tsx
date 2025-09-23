import React from 'react';
import { Platform, Pressable, View, Text, StyleSheet } from 'react-native';

// Dynamic import for theme tokens based on platform
const tokens = Platform.OS === 'web' 
  ? require('@/src/lib/theme-tokens.web')
  : require('@/src/lib/theme-tokens.native');
const { colors, radius } = tokens;

export type Stat = { v: string; l: string };

type Props = {
  title: string;
  subtitle?: string;
  stats?: Stat[];
  onPress?: () => void;
  particleField?: React.ReactNode; // inject <ParticleField />
  peek?: boolean;
};

export function HeroCard({ title, subtitle, stats, onPress, particleField, peek }: Props) {
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.card,
        {
          transform: [{ scale: peek ? 0.96 : 1 }],
          opacity: peek ? 0.78 : 1,
          backgroundColor: colors.card,
          borderColor: colors.border,
        },
      ]}
    >
      {/* subtle neon edge */}
      <View
        pointerEvents="none"
        style={[
          StyleSheet.absoluteFillObject,
          { borderRadius: radius.xl, borderWidth: 1, borderColor: Platform.OS === 'web' ? 'hsl(var(--primary) / .28)' : colors.primary + '55' },
        ]}
      />
      {particleField}
      <View>
        <Text style={styles.title}>{title}</Text>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {stats?.length ? (
        <View style={{ flexDirection: 'row', columnGap: 28 }}>
          {stats.map((s) => (
            <View key={s.l}>
              <Text style={styles.statValue}>{s.v}</Text>
              <Text style={styles.statLabel}>{s.l}</Text>
            </View>
          ))}
        </View>
      ) : null}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    width: 300,
    height: '100%',
    borderRadius: radius.xl,
    padding: 18,
    justifyContent: 'space-between',
    borderWidth: 1,
    overflow: 'hidden',
  },
  title: { fontSize: 28, fontWeight: '300', color: '#fff' },
  subtitle: { marginTop: 4, fontSize: 13, color: Platform.OS === 'web' ? 'hsl(var(--muted-foreground))' : 'rgba(255,255,255,0.65)' },
  statValue: { fontSize: 24, fontWeight: '700', color: '#fff' },
  statLabel: { fontSize: 12, color: Platform.OS === 'web' ? 'hsl(var(--muted-foreground))' : 'rgba(255,255,255,0.65)' },
});