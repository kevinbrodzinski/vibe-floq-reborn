// ─────────────────────────────────────────────────────────────
// src/components/map/DeckLayers.ts
// ─────────────────────────────────────────────────────────────
import { ScatterplotLayer } from "@deck.gl/layers";
import { getClusterColor } from "@/utils/color";
import type { Cluster } from "@/hooks/useClusters";

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
  const time = (Date.now() % 2000) / 2000; // 0-1 loop

  if (!clusters.length) return null;

  return new ScatterplotLayer({
    id: "vibe-pulse",
    data: clusters,
    getPosition: (d) => d.centroid.coordinates,
    getRadius: (d) =>
      30 + Math.sin(time * 2 * Math.PI) * 20 * (d.total / 20),
    radiusUnits: "meters",
    getFillColor: (d) => getClusterColor(d.total / 20, d.vibe_counts, prefs),
    opacity: 0.3,
    pickable: false,
    updateTriggers: { getRadius: time, data: clusters },
  });
};

// Stub – keep API compatible for later halo work
export const createHaloLayer = () => null;