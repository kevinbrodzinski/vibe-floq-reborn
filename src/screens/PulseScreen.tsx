import React, { useMemo } from 'react';
import { ScrollView, View, Text, StyleSheet, Platform } from 'react-native';
import { useFieldHeartbeat } from '@/hooks/useFieldHeartbeat';
import { rankTimeGate } from '@/core/privacy/RankTimeGate';
import MetamorphBattery from '@/components/SocialBattery/MetamorphBattery';

function vibeWord(e: number, dir: 'rising'|'stable'|'falling') {
  if (e < 0.34) return dir === 'rising' ? 'warming up' : dir === 'falling' ? 'recharging' : 'easy';
  if (e < 0.67) return dir === 'rising' ? 'building'   : dir === 'falling' ? 'unwinding'  : 'steady';
  return dir === 'falling' ? 'coming down' : dir === 'rising' ? 'peaking' : 'dialed in';
}

export default function PulseScreen() {
  const hb = useFieldHeartbeat({ envelope: 'balanced' });
  const energy = Math.max(0, Math.min(1, hb?.energy ?? 0.5));
  const slope  = hb?.slope ?? 0;
  const dir: 'rising'|'stable'|'falling' = slope > 0.02 ? 'rising' : slope < -0.02 ? 'falling' : 'stable';
  const vibe = useMemo(() => vibeWord(energy, dir), [energy, dir]);

  // Privacy gate — if some code was returning nothing on suppress,
  // we render a category-only fallback instead of a blank screen.
  const gate = rankTimeGate({
    envelopeId: 'balanced',
    featureTimestamps: [Date.now()],
    cohortSize: 10,
    epsilonCost: 0.01,
  });
  const suppressed = !gate.ok;

  return (
    <ScrollView style={styles.page} contentContainerStyle={styles.grow}>
      {/* Top bar / brand */}
      <View style={styles.topRow}>
        <Text style={styles.brand}>floq</Text>
        <View style={styles.battery}>
          <MetamorphBattery size={40} onPress={() => { /* open energy modal if you want */ }} />
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Title */}
      <View style={styles.headerBlock}>
        <Text style={styles.title}><Text style={styles.pulseGrad}>pulse</Text></Text>
        <Text style={styles.subtitle}>Discovering around you</Text>

        <View style={styles.pill}>
          <Text style={styles.pillText}>current vibe: </Text>
          <Text style={[styles.pillTextStrong]}>{`"${vibe.toUpperCase()}"`}</Text>
        </View>
      </View>

      {/* Body */}
      {suppressed ? (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Privacy-first mode</Text>
          <Text style={styles.cardBody}>
            We're showing category-only results until we have enough nearby signals.
          </Text>
          <View style={styles.skeletonRow} />
          <View style={styles.skeletonRow} />
          <View style={styles.skeletonRow} />
        </View>
      ) : (
        <View style={styles.card}>
          <Text style={styles.cardTitle}>Live Pulse</Text>
          <Text style={styles.cardBody}>
            Nearby energy & convergence will appear here as we detect safe, high-quality signals.
          </Text>
          <View style={styles.sparkline} />
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  page: { flex: 1, backgroundColor: 'hsl(var(--background, 220 15% 7%))' },
  grow: { padding: 16, paddingBottom: 40 },
  topRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 },
  brand: { fontSize: 22, fontWeight: '800', color: 'hsl(var(--foreground, 0 0% 98%))' },
  battery: { alignItems: 'center', justifyContent: 'center' },

  headerBlock: { marginTop: 8, marginBottom: 16 },
  title: { fontSize: 48, fontWeight: '900', lineHeight: 52, marginBottom: 4, color: 'hsl(var(--foreground, 0 0% 98%))' },
  pulseGrad: {
    // minimal gradient-ish look on web; RN will just render text color
    color: 'hsl(var(--primary, 190 100% 50%))'
  },
  subtitle: { color: 'hsl(var(--muted-foreground, 0 0% 70%))', fontSize: 14 },

  pill: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'hsl(var(--border, 0 0% 25%))',
    backgroundColor: 'rgba(255,255,255,0.04)',
    flexDirection: 'row',
    gap: 6,
  },
  pillText: { fontSize: 12, color: 'hsl(var(--muted-foreground, 0 0% 70%))' },
  pillTextStrong: { fontSize: 12, fontWeight: '800', color: 'hsl(var(--primary-foreground, 0 0% 100%))' },

  card: {
    marginTop: 18,
    borderWidth: 1,
    borderColor: 'hsl(var(--border, 0 0% 25%))',
    backgroundColor: 'rgba(255,255,255,0.04)',
    borderRadius: 16,
    padding: 14,
  },
  cardTitle: { fontWeight: '800', fontSize: 14, color: 'hsl(var(--foreground, 0 0% 98%))' },
  cardBody: { marginTop: 6, color: 'hsl(var(--muted-foreground, 0 0% 70%))', fontSize: 13 },

  skeletonRow: { marginTop: 10, height: 10, borderRadius: 8, backgroundColor: 'rgba(255,255,255,0.08)' },
  sparkline: { marginTop: 12, height: 84, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.05)' },
});