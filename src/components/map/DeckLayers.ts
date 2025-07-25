// ─────────────────────────────────────────────────────────────
// src/components/map/DeckLayers.ts
// ─────────────────────────────────────────────────────────────
import { ScatterplotLayer } from "@deck.gl/layers";
import { getClusterColor, getClusterStrokeColor, getVibeIntensity } from "@/utils/color";
import type { Cluster } from "@/hooks/useClusters";

// Module-scope timer to avoid re-evaluation on hot-reload
const t0 = Date.now();

/* Enhanced density layer with vibe-aware sizing and colors ----------- */
export const createDensityLayer = (
  clusters: Cluster[],
  prefs: Record<string, number>,
  onClick: (c: Cluster) => void,
) => {
  if (!clusters.length) return null;

  // Use member_count for more accurate sizing
  const maxMemberCount = Math.max(...clusters.map(c => c.member_count || c.total || 1));

  return new ScatterplotLayer({
    id: "vibe-density",
    data: clusters,
    getPosition: (d) => d.centroid.coordinates,
    getRadius: (d) => {
      const count = d.member_count || d.total || 1;
      // Enhanced sizing: min 40m, max 200m, with sqrt scaling
      return Math.max(40, Math.min(200, Math.sqrt(count) * 12));
    },
    getFillColor: (d) => {
      try {
        const count = d.member_count || d.total || 1;
        const normalizedScore = maxMemberCount > 0 ? count / maxMemberCount : 0;
        // Use enhanced color with vibe_mode
        return getClusterColor(normalizedScore, d.vibe_counts || {}, prefs || {}, d.vibe_mode);
      } catch (error) {
        console.warn('Color calculation failed, using fallback:', error);
        return [70, 130, 180]; // Steel blue fallback
      }
    },
    getLineColor: (d) => {
      try {
        return getClusterStrokeColor(d.vibe_mode);
      } catch (error) {
        return [255, 255, 255]; // White fallback
      }
    },
    getLineWidth: 2,
    lineWidthUnits: "pixels",
    stroked: true,
    radiusUnits: "meters",
    opacity: 0.7,
    pickable: true,
    onClick: ({ object }) => object && onClick(object as Cluster),
    updateTriggers: { 
      getFillColor: [clusters, prefs], 
      getLineColor: [clusters],
      getRadius: [clusters]
    },
  });
};

/* Enhanced pulse layer with vibe-specific intensity ----------------- */
export const usePulseLayer = (
  clusters: Cluster[],
  prefs: Record<string, number>,
) => {
  // Check for reduced motion preference
  if (typeof window !== 'undefined' && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    return null;
  }

  // Use module-scope timer for stable animation
  const getT = () => ((Date.now() - t0) % 2000) / 2000; // 0-1 pulse

  if (!clusters.length) return null;

  const maxMemberCount = Math.max(...clusters.map(c => c.member_count || c.total || 1));

  return new ScatterplotLayer({
    id: "vibe-pulse",
    data: clusters,
    getPosition: (d) => d.centroid.coordinates,
    getRadius: (d) => {
      const t = getT();
      const count = d.member_count || d.total || 1;
      const normalizedCount = maxMemberCount > 0 ? count / maxMemberCount : 0;
      const vibeIntensity = getVibeIntensity(d.vibe_mode);
      
      // Base radius + pulse amplitude scaled by both count and vibe intensity
      const baseRadius = 35;
      const pulseAmplitude = 25 * normalizedCount * vibeIntensity;
      return baseRadius + Math.sin(t * 2 * Math.PI) * pulseAmplitude;
    },
    radiusUnits: "meters",
    getFillColor: (d) => {
      try {
        const count = d.member_count || d.total || 1;
        const normalizedScore = maxMemberCount > 0 ? count / maxMemberCount : 0;
        const color = getClusterColor(normalizedScore, d.vibe_counts || {}, prefs || {}, d.vibe_mode);
        // Add transparency for pulse effect
        return [...color, 77] as [number, number, number, number]; // ~30% opacity
      } catch (error) {
        console.warn('Pulse color calculation failed, using fallback:', error);
        return [70, 130, 180, 77]; // Semi-transparent steel blue
      }
    },
    opacity: 0.25,
    pickable: false,
    updateTriggers: { 
      getRadius: [clusters, prefs], 
      getFillColor: [clusters, prefs]
    },
  });
};

// Stub – keep API compatible for later halo work
export const createHaloLayer = () => null;
