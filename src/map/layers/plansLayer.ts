import { AnyLayer } from 'mapbox-gl';

/** Renders individual plan points (multi-stop activities) with distinctive styling */
export const planPointsLayer: AnyLayer = {
  id: 'plan-points',
  type: 'circle',
  source: 'plans',
  filter: ['!', ['has', 'point_count']], // Only non-clustered points
  paint: {
    'circle-radius': [
      'case',
      // Larger for plans with more stops to show complexity
      ['>', ['get', 'stop_count'], 5], 16,
      ['>', ['get', 'stop_count'], 3], 14,
      ['>', ['get', 'stop_count'], 1], 12,
      10 // Single stop (should be rare for plans)
    ],
    'circle-color': [
      'case',
      // Plan status-based colors
      ['==', ['get', 'status'], 'active'], '#10B981',    // Green for active
      ['==', ['get', 'status'], 'draft'], '#F59E0B',     // Orange for draft
      ['==', ['get', 'status'], 'completed'], '#6B7280', // Gray for completed
      ['==', ['get', 'status'], 'cancelled'], '#EF4444', // Red for cancelled
      // Fallback to vibe colors if no status
      ['==', ['get', 'primary_vibe'], 'social'], '#059669',
      ['==', ['get', 'primary_vibe'], 'hype'], '#DC2626',
      ['==', ['get', 'primary_vibe'], 'curious'], '#7C3AED',
      ['==', ['get', 'primary_vibe'], 'chill'], '#2563EB',
      ['==', ['get', 'primary_vibe'], 'romantic'], '#EC4899',
      '#8B5CF6' // Default purple for plans
    ],
    'circle-opacity': 0.9,
    'circle-stroke-width': 3, // Thicker stroke than floqs
    'circle-stroke-color': [
      'case',
      // White stroke for most, yellow for active plans
      ['==', ['get', 'status'], 'active'], '#FDE047',
      '#FFFFFF'
    ],
    'circle-stroke-opacity': 1,
    // Add a subtle inner ring to distinguish from floqs
    'circle-stroke-dasharray': [2, 1] // Dashed stroke for plans
  }
};

/** Renders plan clusters when multiple plans are close together */
export const planClustersLayer: AnyLayer = {
  id: 'plan-clusters',
  type: 'circle',
  source: 'plans',
  filter: ['has', 'point_count'],
  paint: {
    'circle-color': '#8B5CF6', // Purple theme for plan clusters
    'circle-radius': [
      'step',
      ['get', 'point_count'],
      22, 2,   // Slightly larger than floq clusters
      32, 5,   
      42, 10,  
      52       
    ],
    'circle-opacity': 0.85,
    'circle-stroke-width': 3,
    'circle-stroke-color': '#FFFFFF',
    'circle-stroke-opacity': 1,
    'circle-stroke-dasharray': [3, 2] // Dashed stroke for plan clusters
  }
};

/** Renders cluster count labels for plans */
export const planClusterCountLayer: AnyLayer = {
  id: 'plan-cluster-count',
  type: 'symbol',
  source: 'plans',
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

/** Renders stop count indicators for individual plans */
export const planStopCountLayer: AnyLayer = {
  id: 'plan-stop-indicators',
  type: 'symbol',
  source: 'plans',
  filter: [
    'all',
    ['!', ['has', 'point_count']], // Only non-clustered
    ['>', ['get', 'stop_count'], 1] // Only multi-stop plans
  ],
  layout: {
    'text-field': ['concat', ['get', 'stop_count'], ''],
    'text-font': ['DIN Offc Pro Bold', 'Arial Unicode MS Bold'],
    'text-size': 11,
    'text-allow-overlap': true,
    'text-anchor': 'center',
    'text-offset': [0, 0]
  },
  paint: {
    'text-color': '#FFFFFF',
    'text-halo-color': '#000000',
    'text-halo-width': 1.5
  }
};