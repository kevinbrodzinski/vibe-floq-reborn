// ─────────────────────────────────────────────────────────────
// src/components/map/DeckLayers.ts
// ─────────────────────────────────────────────────────────────
import { ScatterplotLayer } from "@deck.gl/layers";
import { 
  clusterSizePx, 
  clusterFill, 
  clusterStroke 
} from "@/utils/clusterColor";
import type { Cluster } from "@/hooks/useClusters";

// Module-scope timer to avoid re-evaluation on hot-reload
const t0 = Date.now();

/* Enhanced density layer using new cluster utilities ----------------- */
export const createDensityLayer = (
  clusters: Cluster[],
  prefs: Record<string, number>,
  onClick: (c: Cluster) => void,
) => {
  if (!clusters.length) return null;

  return new ScatterplotLayer({
    id: "vibe-density",
    data: clusters,
    getPosition: (d) => d.centroid.coordinates,
    getRadius: (d) => clusterSizePx(d.member_count || d.total || 1),
    getFillColor: (d) => {
      try {
        return clusterFill(d as any);
      } catch (error) {
        console.warn('Color calculation failed, using fallback:', error);
        return [100, 116, 139]; // slate-500 fallback
      }
    },
    getLineColor: (d) => {
      try {
        return clusterStroke(d as any);
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
    autoHighlight: true,
    onClick: ({ object }) => object && onClick(object as Cluster),
    getTooltip: ({ object: c }) =>
      c
        ? `${c.member_count || c.total} people · ${c.vibe_mode?.toUpperCase() || 'UNKNOWN'}`
        : null,
    updateTriggers: { 
      getFillColor: [clusters], 
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
      // stronger pulse if vibe is "hype"
      const vibeBoost = d.vibe_mode === 'hype' ? 0.3 : 0;
      const intensity = Math.min(1, count / 80 + vibeBoost);
      
      const baseRadius = 35;
      const pulseAmplitude = 25 * intensity;
      return baseRadius + Math.sin(t * 2 * Math.PI) * pulseAmplitude;
    },
    radiusUnits: "meters",
    getFillColor: (d) => {
      try {
        const color = clusterFill(d as any);
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
