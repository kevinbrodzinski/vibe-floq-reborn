// Minimal interface matching your edge function
export type RelSets = { close: Set<string>; friends: Set<string> };

type BaseTile = {
  tile_id: string;
  crowd_count: number;
  avg_vibe: { h:number; s:number; l:number };
  updated_at: string;
  centroid?: { lat:number; lng:number };
  active_floq_ids?: string[];
};

export type EnhancedTileOut = {
  tile_id: string;
  crowd_count: number;
  avg_vibe: BaseTile["avg_vibe"];
  updated_at: string;
  centroid?: BaseTile["centroid"];
  active_floq_ids: string[];
  velocity?: { vx:number; vy:number; magnitude:number; heading:number; confidence:number };
  movement_mode: "stationary"|"walking"|"cycling"|"driving"|"transit";
  history?: Array<{ timestamp:string; crowd_count:number; centroid:{lat:number;lng:number}; vibe?: BaseTile["avg_vibe"] }>;
  afterglow_intensity: number;
};

const K_MIN = 5;

export function shapeTilesForViewer(
  baseTiles: BaseTile[],
  includeHistory: boolean,
  relSets: RelSets | null,
  viewerId: string | null
): EnhancedTileOut[] {
  const tiles: EnhancedTileOut[] = [];
  for (const curr of baseTiles) {
    const underK = (curr.crowd_count ?? 0) < K_MIN;

    // history + velocity omitted when under K
    const history = (!underK && includeHistory) ? [{
      timestamp: curr.updated_at,
      crowd_count: curr.crowd_count,
      centroid: curr.centroid ?? { lat:0, lng:0 },
      vibe: curr.avg_vibe
    }] : undefined;

    // we omit computing velocity here; test only audience & k-anon
    let velocity = undefined;

    // audience filter
    const allIds = curr.active_floq_ids ?? [];
    let filtered: string[] = [];
    if (!underK && viewerId && relSets) {
      filtered = allIds.filter(id => relSets.close.has(id) || relSets.friends.has(id));
    }

    // afterglow simple proxy (age not available in test; keep constant)
    const afterglow = Math.min(1, curr.crowd_count / 50);

    tiles.push({
      tile_id: curr.tile_id,
      crowd_count: curr.crowd_count,
      avg_vibe: curr.avg_vibe,
      updated_at: curr.updated_at,
      centroid: curr.centroid,
      active_floq_ids: filtered,
      velocity,
      movement_mode: "stationary",
      history,
      afterglow_intensity: afterglow
    });
  }
  return tiles;
}
