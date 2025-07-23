// ─────────────────────────────────────────────────────────────
// src/components/map/DeckLayers.ts
// ─────────────────────────────────────────────────────────────
import { ScatterplotLayer } from "@deck.gl/layers";
import { getClusterColor } from "@/utils/color";
import type { Cluster } from "@/hooks/useClusters";

// Module-scope timer to avoid re-evaluation on hot-reload
const t0 = Date.now();

/* Density layer ------------------------------------------------------ */
export const createDensityLayer = (
  clusters: Cluster[],
  prefs: Record<string, number>,
  onClick: (c: Cluster) => void,
) => {
  if (!clusters.length) return null;

  const maxTotal = Math.max(...clusters.map(c => c.total));

  return new ScatterplotLayer({
    id: "vibe-density",
    data: clusters,
    getPosition: (d) => d.centroid.coordinates,
    getRadius: (d) => Math.max(50, Math.sqrt(d.total) * 10),
    getFillColor: (d) => {
      try {
        const normalizedScore = maxTotal > 0 ? d.total / maxTotal : 0;
        return getClusterColor(normalizedScore, d.vibe_counts || {}, prefs || {});
      } catch (error) {
        console.warn('Color calculation failed, using fallback:', error);
        // Fallback to blue
        return [70, 130, 180];
      }
    },
    radiusUnits: "meters",
    opacity: 0.6,
    pickable: true,
    onClick: ({ object }) => object && onClick(object as Cluster),
    updateTriggers: { data: clusters, prefs },
  });
};

/* Pulse layer -------------------------------------------------------- */
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

  const maxTotal = Math.max(...clusters.map(c => c.total));

  return new ScatterplotLayer({
    id: "vibe-pulse",
    data: clusters,
    getPosition: (d) => d.centroid.coordinates,
    getRadius: (d) => {
      const t = getT();
      return 30 + Math.sin(t * 2 * Math.PI) * 20 * (maxTotal > 0 ? d.total / maxTotal : 0);
    },
    radiusUnits: "meters",
    getFillColor: (d) => {
      try {
        const normalizedScore = maxTotal > 0 ? d.total / maxTotal : 0;
        // Check for reduced motion preference
        if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
          return getClusterColor(normalizedScore, d.vibe_counts || {}, prefs || {});
        }
        return getClusterColor(normalizedScore, d.vibe_counts || {}, prefs || {});
      } catch (error) {
        console.warn('Pulse color calculation failed, using fallback:', error);
        // Fallback to semi-transparent blue
        return [70, 130, 180, 77]; // 30% opacity
      }
    },
    opacity: 0.3,
    pickable: false,
    // time is read from ref, so no trigger required
    updateTriggers: { getRadius: [clusters, prefs], data: clusters },
  });
};

// Stub – keep API compatible for later halo work
export const createHaloLayer = () => null;
