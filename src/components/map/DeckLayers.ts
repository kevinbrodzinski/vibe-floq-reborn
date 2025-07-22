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

  return new ScatterplotLayer({
    id: "vibe-density",
    data: clusters,
    getPosition: (d: Cluster) => d.centroid.coordinates,
    getRadius: (d: Cluster) => Math.max(50, Math.sqrt(d.total) * 10),
    getFillColor: (d: Cluster) => getClusterColor(d.total / 20, d.vibe_counts, prefs),
    radiusUnits: "meters",
    pickable: true,
    onClick: ({ object }) => object && onClick(object),
    opacity: 0.6,
    updateTriggers: { data: clusters, prefs },
  });
};

/* Pulse layer -------------------------------------------------------- */
export const usePulseLayer = (
  clusters: Cluster[],
  prefs: Record<string, number>,
) => {
  const time = (Date.now() % 2000) / 2000; // 0→1 loop

  if (!clusters.length) return null;

  return new ScatterplotLayer({
    id: "vibe-pulse",
    data: clusters,
    getPosition: (d: Cluster) => d.centroid.coordinates,
    getRadius: (d: Cluster) =>
      30 + Math.sin(time * 2 * Math.PI) * 20 * (d.total / 20),
    radiusUnits: "meters",
    getFillColor: (d: Cluster) =>
      getClusterColor(d.total / 20, d.vibe_counts, prefs),
    opacity: 0.3,
    pickable: false,
    updateTriggers: { getRadius: time, data: clusters },
  });
};

// Add missing createHaloLayer export for compatibility
export const createHaloLayer = () => null;