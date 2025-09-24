import { AnyLayer } from 'mapbox-gl';

/** Renders individual floq points (single-stop activities) with vibe-based colors */
export const floqPointsLayer: AnyLayer = {
  id: 'floq-points',
  type: 'circle',
  source: 'floqs',
  filter: ['!', ['has', 'point_count']], // Only non-clustered points
  paint: {
    'circle-radius': [
      'case',
      // Slightly larger for floqs with more participants
      ['>', ['get', 'participant_count'], 5], 14,
      ['>', ['get', 'participant_count'], 2], 12,
      10 // Default size
    ],
    'circle-color': [
      'case',
      // Vibe-based colors (consistent with existing system)
      ['==', ['get', 'vibe'], 'social'], '#059669',    // Green
      ['==', ['get', 'vibe'], 'hype'], '#DC2626',      // Red  
      ['==', ['get', 'vibe'], 'curious'], '#7C3AED',   // Purple
      ['==', ['get', 'vibe'], 'chill'], '#2563EB',     // Blue
      ['==', ['get', 'vibe'], 'solo'], '#0891B2',      // Cyan
      ['==', ['get', 'vibe'], 'romantic'], '#EC4899',  // Pink
      ['==', ['get', 'vibe'], 'weird'], '#F59E0B',     // Orange
      ['==', ['get', 'vibe'], 'down'], '#6B7280',      // Gray
      ['==', ['get', 'vibe'], 'flowing'], '#10B981',   // Emerald
      ['==', ['get', 'vibe'], 'open'], '#84CC16',      // Lime
      '#4B5563' // Default gray
    ],
    'circle-opacity': 0.95,
    'circle-stroke-width': 2,
    'circle-stroke-color': '#FFFFFF',
    'circle-stroke-opacity': 1
  }
};

/** Renders floq clusters when multiple floqs are close together */
export const floqClustersLayer: AnyLayer = {
  id: 'floq-clusters',
  type: 'circle',
  source: 'floqs',
  filter: ['has', 'point_count'],
  paint: {
    'circle-color': [
      'case',
      // Cluster colors based on dominant vibe
      ['>', ['get', 'social'], 0], '#059669',
      ['>', ['get', 'hype'], 0], '#DC2626',
      ['>', ['get', 'curious'], 0], '#7C3AED',
      ['>', ['get', 'chill'], 0], '#2563EB',
      ['>', ['get', 'solo'], 0], '#0891B2',
      ['>', ['get', 'romantic'], 0], '#EC4899',
      ['>', ['get', 'weird'], 0], '#F59E0B',
      ['>', ['get', 'down'], 0], '#6B7280',
      ['>', ['get', 'flowing'], 0], '#10B981',
      ['>', ['get', 'open'], 0], '#84CC16',
      '#4B5563'
    ],
    'circle-radius': [
      'step',
      ['get', 'point_count'],
      20, 2,   // 20px for 2+ floqs
      30, 5,   // 30px for 5+ floqs
      40, 10,  // 40px for 10+ floqs
      50       // 50px for 20+ floqs
    ],
    'circle-opacity': 0.9,
    'circle-stroke-width': 3,
    'circle-stroke-color': '#FFFFFF',
    'circle-stroke-opacity': 1
  }
};

/** Renders cluster count labels */
export const floqClusterCountLayer: AnyLayer = {
  id: 'floq-cluster-count',
  type: 'symbol',
  source: 'floqs',
  filter: ['has', 'point_count'],
  layout: {
    'text-field': ['get', 'point_count'],
    'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
    'text-size': 16,
    'text-allow-overlap': true
  },
  paint: {
    'text-color': '#FFFFFF',
    'text-halo-color': '#000000',
    'text-halo-width': 2
  }
};