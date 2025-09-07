import * as Comlink from 'comlink';
import type { SocialCluster, VibeToken, ConvergenceEvent, CentroidState } from '@/types/field';
import { stableClusterId } from '@/lib/field/clusterId';
import { CLUSTER, PHASE2, FIELD_LOD } from '@/lib/field/constants';

/* ────────────── types ────────────── */
export interface RawTile {
  id: string;                       // tile_id (kept for provenance / hit-test)
  x: number;                        // screen-space px  (projectToScreen)
  y: number;
  r: number;                        // radius  (crowdCountToRadius)
  count: number;                    // member count for k-anon gates
  vibe: VibeToken;                  // design token, not raw HSL
}

/* ────────────── helpers ────────────── */
const mergeDistanceForZoom = (zoom: number) =>
  CLUSTER.BASE_MERGE_DISTANCE * Math.pow(2, 11 - zoom); // shrinks as we zoom in

let lastClusters: SocialCluster[] | null = null;

// Phase 2: Cluster history for lifecycle tracking
const clusterHistory = new Map<string, {
  count: number;
  timestamp: number;
  formationTime: number;
  lastGrowth: number;
  breathingPhase?: number;
}>();

/* ────────────── Phase 2: Velocity tracking & convergence ────────────── */
const lastMap = new Map<string, CentroidState>();

function buildVelocityMap(now: number, curr: SocialCluster[]): Map<string, CentroidState> {
  const next = new Map<string, CentroidState>();
  for (const c of curr) {
    const prev = lastMap.get(c.id);
    const dt = prev ? Math.max(1, now - prev.t) : 16;
    const vx = prev ? (c.x - prev.x) / dt : 0;
    const vy = prev ? (c.y - prev.y) / dt : 0;
    next.set(c.id, { 
      x: c.x, y: c.y, vx, vy, t: now, 
      cohesion: c.cohesionScore ?? 0, 
      k: c.count 
    });
  }
  lastMap.clear(); 
  for (const [k, v] of next) lastMap.set(k, v);
  return next;
}

function gridPairs(keys: string[], map: Map<string, CentroidState>, cell: number): Array<[string, string]> {
  // Simple uniform grid binning in screen space
  const bins = new Map<string, string[]>();
  for (const id of keys) {
    const c = map.get(id)!; 
    const gx = Math.floor(c.x / cell); 
    const gy = Math.floor(c.y / cell);
    const key = `${gx}:${gy}`; 
    (bins.get(key) ?? bins.set(key, []).get(key)!).push(id);
  }
  const pairs: Array<[string, string]> = [];
  const neigh = [[0,0],[1,0],[0,1],[1,1],[-1,0],[0,-1],[-1,-1],[1,-1],[-1,1]];
  for (const [bk, ids] of bins) {
    const [gx, gy] = bk.split(':').map(Number);
    for (const [dx, dy] of neigh) {
      const nk = `${gx + dx}:${gy + dy}`; 
      const other = bins.get(nk); 
      if (!other) continue;
      for (const a of ids) {
        for (const b of other) {
          if (a < b) pairs.push([a, b]);
        }
      }
    }
  }
  return pairs;
}

// Math core: closest approach under constant velocity
function closestApproach(a: CentroidState, b: CentroidState) {
  const rx = b.x - a.x, ry = b.y - a.y;
  const vx = b.vx - a.vx, vy = b.vy - a.vy;
  const vv = vx * vx + vy * vy;
  if (vv === 0) return { 
    tStar: Infinity, 
    d2: rx * rx + ry * ry, 
    mx: (a.x + b.x) / 2, 
    my: (a.y + b.y) / 2 
  };
  const tStar = -(rx * vx + ry * vy) / vv; // ms
  const mx = a.x + a.vx * tStar; 
  const my = a.y + a.vy * tStar;
  const dx = rx + vx * tStar; 
  const dy = ry + vy * tStar;
  return { tStar, d2: dx * dx + dy * dy, mx, my };
}

let lastEmit = 0;

/* ────────────── Persistent worker instance ────────────── */
class ClusteringWorker {
  private lastProcessTime = Date.now();
  private clusters = new Map<string, SocialCluster>();
  
  cluster(tiles: RawTile[], zoom = 11): SocialCluster[] {
    const threshold = mergeDistanceForZoom(zoom);
    const work: Array<{x:number;y:number;r:number;count:number;vibe:VibeToken;_ids:string[];cohesionScore:number}> = [];

    try {
      for (const t of tiles) {
        // Privacy gate: only process tiles with sufficient count
        if (t.count < FIELD_LOD.K_MIN) continue;
        
        const hit = work.find(c => {
          const dx = c.x - t.x, dy = c.y - t.y;
          return (dx*dx + dy*dy) < (threshold*threshold);
        });
        
        if (hit) {
          const n = hit.count + t.count;
          hit.x = (hit.x * hit.count + t.x * t.count) / n;
          hit.y = (hit.y * hit.count + t.y * t.count) / n;
          hit.r = Math.max(hit.r, t.r);
          hit.count = n;
          hit._ids.push(t.id);
          hit.cohesionScore = Math.min(n / 10, 1);
        } else {
          work.push({ x:t.x, y:t.y, r:t.r, count:t.count, vibe:t.vibe, _ids:[t.id], cohesionScore:0.1 });
        }
      }
    } catch (err) {
      console.error('[cluster-worker]', err);
    }

    // Phase 2: Convert to enhanced format with social physics
    const now = Date.now();
    const finalClusters: SocialCluster[] = work.map(c => {
      const id = stableClusterId(c._ids);
      const history = clusterHistory.get(id);
      
      // Calculate spatial density for better cohesion
      const spatialDensity = c.count / (Math.PI * c.r * c.r);
      const normalizedDensity = Math.min(1, spatialDensity / 0.01);
      const enhancedCohesion = Math.min(1, normalizedDensity * 0.7 + c.cohesionScore * 0.3);
      
      // Determine lifecycle stage
      let lifecycleStage: SocialCluster['lifecycleStage'] = 'forming';
      let formationTime = now;
      
      if (history) {
        const age = now - history.formationTime;
        const growth = (c.count - history.count) / Math.max(history.count, 1);
        formationTime = history.formationTime;
        
        if (age < 30000) lifecycleStage = 'forming';  // First 30s
        else if (growth > 0.3) lifecycleStage = 'forming'; // Growing rapidly
        else if (growth < -0.3) lifecycleStage = 'dispersing'; // Shrinking
        else if (c.count > 15 && enhancedCohesion > 0.7) lifecycleStage = 'peaking';
        else lifecycleStage = 'stable';
      }
      
      // Calculate breathing parameters based on cluster properties
      const baseRate = 20 + Math.min(15, c.count / 3); // 20-35 BPM
      const energyLevel = Math.min(1, c.count / 25 + (lifecycleStage === 'peaking' ? 0.3 : 0));
      const pulseIntensity = 0.3 + enhancedCohesion * 0.4 + energyLevel * 0.3;
      
      // Advance breathing phase using history timestamp only
      const prevPhase = history?.breathingPhase ?? Math.random() * Math.PI * 2;
      const dt = history ? (now - history.timestamp) / 1000 : 0.016;
      const phaseAdvance = (baseRate / 60) * 2 * Math.PI * dt;
      const breathingPhase = (prevPhase + phaseAdvance) % (2 * Math.PI);
      
      // Update history
      clusterHistory.set(id, {
        count: c.count,
        timestamp: now,
        formationTime,
        lastGrowth: history ? (c.count - history.count) : 0,
        breathingPhase
      });
      
      return {
        id,
        x: c.x, 
        y: c.y, 
        r: c.r, 
        count: c.count, 
        vibe: c.vibe,
        
        // Phase 2: Social Physics Properties
        cohesionScore: enhancedCohesion,
        breathingPhase,
        breathingRate: baseRate,
        energyLevel,
        lifecycleStage,
        socialGravity: Math.min(1, c.count / 40),
        pulseIntensity,
        glowRadius: Math.sqrt(c.count) * 12 * (1 + energyLevel * 0.4),
        formationTime
        
        // No ids field - keep provenance private
      };
    });

    // Clean old history entries (older than 5 minutes for better lifecycle tracking)
    for (const [id, history] of clusterHistory) {
      if (now - history.timestamp > 300000) {
        clusterHistory.delete(id);
      }
    }
    
    lastClusters = finalClusters;
    return finalClusters;
  }

  /** cursor hit-test → returns cluster_ids within `radius` px (dev only) */
  hitTest(x: number, y: number, radius = 12): string[] {
    if (!lastClusters) return [];
    const r2 = radius * radius;
    return lastClusters
      .filter(c => {
        const dx = c.x - x;
        const dy = c.y - y;
        return dx * dx + dy * dy <= r2;
      })
      .map(c => c.id); // Return cluster IDs only, not tile provenance
  }

  /** Phase 2: convergence prediction with social physics */
  signals(curr: SocialCluster[], zoom: number, now = performance.now()): { convergences: ConvergenceEvent[] } {
    const S = PHASE2.CONVERGENCE;
    const vel = buildVelocityMap(now, curr);
    const keys = curr.map(c => c.id);

    // only recompute at ~10Hz
    if (now - lastEmit < 100) return { convergences: [] };
    lastEmit = now;

    // LOD gate
    if (zoom < S.ZOOM_MIN) return { convergences: [] };

    const pairs = gridPairs(keys, vel, S.MAX_DIST_PX);
    const out: ConvergenceEvent[] = [];

    for (const [ia, ib] of pairs) {
      const a = vel.get(ia)!; 
      const b = vel.get(ib)!;
      if (a.k < S.K_MIN || b.k < S.K_MIN) continue;
      if (Math.max(a.cohesion, b.cohesion) < S.MIN_COHESION) continue;

      const { tStar, d2, mx, my } = closestApproach(a, b);
      if (tStar <= 0 || tStar > S.HORIZON_MS) continue;
      const d = Math.sqrt(d2);
      if (d > S.MAX_DIST_PX) continue;

      const approachSpeed = Math.hypot(b.vx - a.vx, b.vy - a.vy);
      if (approachSpeed < S.MIN_APPROACH_SPEED) continue;

      const conf =
        0.35 * Math.min(1, (S.MAX_DIST_PX - d) / S.MAX_DIST_PX) +
        0.35 * Math.min(1, approachSpeed / (S.MIN_APPROACH_SPEED * 6)) +
        0.30 * Math.max(a.cohesion, b.cohesion);

      out.push({
        id: `cx_${ia}_${ib}`,
        a: ia, b: ib,
        meeting: { x: mx, y: my },
        etaMs: tStar,
        dStar: d,
        confidence: Math.max(0, Math.min(1, conf)),
      });
    }
    // hysteresis (cooldown) will be handled on the UI side with TTL if desired
    return { convergences: out };
  }

  /** Reset worker state on projection/scale changes */
  reset(): void {
    clusterHistory.clear();
    lastMap.clear();
    lastClusters = null;
    lastEmit = 0;
  }
}

// Persistent worker instance
const workerInstance = new ClusteringWorker();

const api = {
  cluster: (tiles: RawTile[], zoom = 11) => workerInstance.cluster(tiles, zoom),
  hitTest: (x: number, y: number, radius = 12) => workerInstance.hitTest(x, y, radius),
  signals: (curr: SocialCluster[], zoom: number, now = performance.now()) => workerInstance.signals(curr, zoom, now),
  reset: () => workerInstance.reset(),
};

Comlink.expose(api);