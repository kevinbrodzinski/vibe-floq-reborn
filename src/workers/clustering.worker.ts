import * as Comlink from 'comlink';
import type { SocialCluster, VibeToken, ConvergenceEvent, CentroidState } from '@/types/field';
import type { FlowCell, LaneSegment, MomentumStat, PressureCell, StormGroup } from '@/lib/field/types';
import { stableClusterId } from '@/lib/field/clusterId';
import { CLUSTER, PHASE2, FIELD_LOD, P3, ATMO, P3B } from '@/lib/field/constants';
import { safe, safeAngle } from '@/lib/math/safety';

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
  
  // Phase 3 caches/throttle
  private flowEma = new Map<string, { vx: number; vy: number; mag: number }>();
  private lastFlowTs = 0;
  private lastFlowCells: FlowCell[] = [];
  private laneCache = new Map<string, LaneSegment & { lastSeen: number }>();

  // Phase 3B caches (atmospheric)
  private pressureEma = new Map<string, number>();
  private lastPressureTs = 0;
  private lastPressureCells: PressureCell[] = [];

  // Make helper methods available to class
  private buildVelocityMap = buildVelocityMap;
  private closestApproach = closestApproach;
  
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
    this.flowEma.clear();
    this.lastFlowCells = [];
    this.laneCache.clear();
    this.lastFlowTs = 0;
    this.pressureEma.clear();
    this.lastPressureCells = [];
    this.lastPressureTs = 0;
  }

  // Phase 3B helper method
  private cellKey(gx: number, gy: number) { return `${gx}:${gy}`; }

  // Phase 3 helper methods
  private gridIndex(x: number, y: number, gridPx: number) {
    const gx = Math.round(x / gridPx);
    const gy = Math.round(y / gridPx);
    return { gx, gy, key: `${gx}:${gy}` };
  }

  private emaUpdate(prev: {vx: number; vy: number; mag: number} | undefined,
                    cur: {vx: number; vy: number}, alpha: number) {
    if (!prev) {
      const mag = Math.hypot(cur.vx, cur.vy);
      return { vx: cur.vx, vy: cur.vy, mag };
    }
    const vx = alpha * prev.vx + (1 - alpha) * cur.vx;
    const vy = alpha * prev.vy + (1 - alpha) * cur.vy;
    const mag = Math.hypot(vx, vy);
    return { vx, vy, mag };
  }

  private boundsFromClusters(curr: SocialCluster[], margin = 64) {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    for (const c of curr) {
      if (c.x < minX) minX = c.x;
      if (c.y < minY) minY = c.y;
      if (c.x > maxX) maxX = c.x;
      if (c.y > maxY) maxY = c.y;
    }
    if (!isFinite(minX)) { minX = minY = 0; maxX = maxY = 0; }
    return { minX: minX - margin, minY: minY - margin, maxX: maxX + margin, maxY: maxY + margin };
  }

  private quadBezier(a: {x: number; y: number}, b: {x: number; y: number}, c: {x: number; y: number}, segments = 12) {
    const out: Array<{x: number; y: number}> = [];
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const u = 1 - t;
      const x = u * u * a.x + 2 * u * t * b.x + t * t * c.x;
      const y = u * u * a.y + 2 * u * t * b.y + t * t * c.y;
      out.push({ x, y });
    }
    return out;
  }

  /** Phase 3: Flow field with EMA smoothing and proximity weighting */
  flowGrid(clusters: SocialCluster[], zoom: number): FlowCell[] {
    const now = performance.now();
    const FLOW_INTERVAL_MS = 1000 / P3.FLOW.UPDATE_HZ;
    if (now - this.lastFlowTs < FLOW_INTERVAL_MS) return this.lastFlowCells;

    if (!clusters.length || zoom < P3.FLOW.MIN_ZOOM) {
      this.lastFlowTs = now;
      this.lastFlowCells = [];
      return this.lastFlowCells;
    }

    const vel = this.buildVelocityMap(now, clusters);
    const GRID = 56;
    const { minX, minY, maxX, maxY } = this.boundsFromClusters(clusters, GRID * 1.5);

    const gx0 = Math.floor(minX / GRID), gy0 = Math.floor(minY / GRID);
    const gx1 = Math.ceil(maxX / GRID), gy1 = Math.ceil(maxY / GRID);

    const maxCells = Math.max(P3.FLOW.MAX_ARROWS, 256);
    const cells: FlowCell[] = [];
    const K_MIN = FIELD_LOD.K_MIN;
    const alpha = P3.FLOW.SMOOTH;

    for (let gy = gy0; gy <= gy1; gy++) {
      for (let gx = gx0; gx <= gx1; gx++) {
        if (cells.length >= maxCells) break;

        const cx = gx * GRID, cy = gy * GRID;
        let sumVX = 0, sumVY = 0, sumW = 0;

        for (const c of clusters) {
          if ((c.count ?? 0) < K_MIN) continue;

          const dx = c.x - cx, dy = c.y - cy;
          const d2 = dx * dx + dy * dy;
          const sigma = Math.max(c.r, 40);
          const wSpatial = Math.exp(-d2 / (2 * sigma * sigma));

          const coh = Math.min(1, Math.max(0, c.cohesionScore ?? 0.5));
          const wAttr = (0.3 + 0.7 * coh) * Math.min(1, (c.count ?? 0) / 20);

          const w = wSpatial * wAttr;
          if (w < 1e-4) continue;

          const v = vel.get(c.id);
          if (!v) continue;

          sumVX += w * v.vx;
          sumVY += w * v.vy;
          sumW += w;
        }

        if (sumW <= 0) continue;

        const vx = sumVX / sumW;
        const vy = sumVY / sumW;
        const { key } = this.gridIndex(cx, cy, GRID);
        const prev = this.flowEma.get(key);
        const ema = this.emaUpdate(prev, { vx: safe(vx), vy: safe(vy) }, alpha);
        this.flowEma.set(key, ema);

        cells.push({ x: cx, y: cy, vx: ema.vx, vy: ema.vy, mag: ema.mag });
      }
    }

    cells.sort((a, b) => b.mag - a.mag);
    this.lastFlowCells = cells.slice(0, P3.FLOW.MAX_ARROWS);
    this.lastFlowTs = now;
    return this.lastFlowCells;
  }

  /** Phase 3: Convergence lanes with polyline generation */
  lanes(clusters: SocialCluster[], zoom: number, now = performance.now()): LaneSegment[] {
    const out: LaneSegment[] = [];
    if (zoom < P3.LANES.MIN_ZOOM || clusters.length < 2) return out;

    const K_MIN = P3.LANES.K_MIN;
    const MAX_DIST = P3.LANES.MAX_DIST_PX;
    const MIN_SPEED = PHASE2.CONVERGENCE.MIN_APPROACH_SPEED;
    const HORIZON = P3.LANES.ETA_MAX_MS;
    const CONF_MIN = P3.LANES.PROB_MIN;

    const vel = this.buildVelocityMap(now, clusters);
    const G = ATMO.BREATHING?.GRID_PX ?? 150;
    const bins = new Map<string, string[]>();
    
    for (const c of clusters) {
      const gx = (c.x / G) | 0, gy = (c.y / G) | 0;
      const k = `${gx}:${gy}`;
      (bins.get(k) ?? bins.set(k, []).get(k)!).push(c.id);
    }
    
    const neigh = [[0,0],[1,0],[0,1],[1,1],[-1,0],[0,-1],[-1,-1],[1,-1],[-1,1]];
    const seen = new Set<string>();
    const pickCluster = (id: string) => clusters.find(c => c.id === id)!;

    for (const [key, ids] of bins) {
      const [gx, gy] = key.split(':').map(Number);
      for (const [dx, dy] of neigh) {
        const other = bins.get(`${gx+dx}:${gy+dy}`);
        if (!other) continue;
        for (const aId of ids) for (const bId of other) if (aId < bId) {
          const pairKey = `${aId}|${bId}`;
          if (seen.has(pairKey)) continue;
          seen.add(pairKey);

          const a = pickCluster(aId), b = pickCluster(bId);
          if (!a || !b) continue;
          if ((a.count ?? 0) < K_MIN || (b.count ?? 0) < K_MIN) continue;

          const va = vel.get(aId), vb = vel.get(bId);
          if (!va || !vb) continue;

          const dxp = b.x - a.x, dyp = b.y - a.y;
          const dist = Math.hypot(dxp, dyp);
          if (dist > MAX_DIST) continue;

          const { tStar, d2, mx, my } = this.closestApproach(va, vb);
          if (!isFinite(tStar) || tStar <= 0 || tStar > HORIZON) continue;

          const dStar = Math.sqrt(d2);
          if (dStar > MAX_DIST) continue;

          const approachSpeed = Math.hypot(vb.vx - va.vx, vb.vy - va.vy);
          if (approachSpeed < MIN_SPEED) continue;

          const coh = Math.max(a.cohesionScore ?? 0.5, b.cohesionScore ?? 0.5);
          const conf =
            0.35 * Math.min(1, (MAX_DIST - dStar) / MAX_DIST) +
            0.35 * Math.min(1, approachSpeed / (MIN_SPEED * 6)) +
            0.30 * coh;

          if (conf < CONF_MIN) continue;

          const ax = a.x, ay = a.y;
          const bx = b.x, by = b.y;
          const ex = mx, ey = my;

          const dirx = (ex - ax) / (dist || 1), diry = (ey - ay) / (dist || 1);
          const overshoot = Math.max(12, Math.min(40, dist * 0.15));
          const end = { x: ex + dirx * overshoot, y: ey + diry * overshoot };

          const relAng = Math.atan2(vb.vy - va.vy, vb.vx - va.vx);
          const orthx = -Math.sin(relAng), orthy = Math.cos(relAng);
          const mid = {
            x: (ax + ex) * 0.5 + orthx * 18,
            y: (ay + ey) * 0.5 + orthy * 18,
          };

          const pts = this.quadBezier({ x: ax, y: ay }, mid, end, 14);

          const laneId = `lane_${aId}_${bId}`;
          const lane: LaneSegment = {
            id: laneId,
            a: aId,
            b: bId,
            pts,
            conf: Math.max(0, Math.min(1, conf)),
            etaMs: tStar,
          };

          this.laneCache.set(laneId, { ...lane, lastSeen: now });
          out.push(lane);

          if (out.length >= P3.LANES.MAX_LANES) return out;
        }
      }
    }

    // Clean old cached lanes
    for (const [id, cached] of this.laneCache) {
      if (now - cached.lastSeen > 5000) {
        this.laneCache.delete(id);
      }
    }

    return out;
  }

  /** Phase 3: Momentum statistics for badges */
  momentum(clusters: SocialCluster[]): MomentumStat[] {
    const now = performance.now();
    const vel = this.buildVelocityMap(now, clusters);
    
    return clusters
      .filter(c => (c.count ?? 0) >= FIELD_LOD.K_MIN)
      .map(c => {
        const v = vel.get(c.id);
        const speed = v ? Math.hypot(v.vx, v.vy) : 0;
        const heading = v ? Math.atan2(v.vy, v.vx) : 0;
        return { id: c.id, speed, heading };
      })
      .filter(m => m.speed >= P3.MOMENTUM.SPEED_MIN);
  }

  /** Phase 3B: Pressure grid with EMA smoothing and gradient calculation */
  pressureGrid(clusters: SocialCluster[], zoom: number): PressureCell[] {
    const now = performance.now();
    const INTERVAL = 1000 / P3B.PRESSURE.UPDATE_HZ;
    if (now - this.lastPressureTs < INTERVAL) return this.lastPressureCells;

    if (zoom < P3B.PRESSURE.MIN_ZOOM || clusters.length === 0) {
      this.lastPressureTs = now;
      return this.lastPressureCells = [];
    }

    // bounds from current clusters (pixel space), padded by ~2 cells
    const GRID = P3B.PRESSURE.GRID_PX;
    const { minX, minY, maxX, maxY } = this.boundsFromClusters(clusters, GRID * 2);

    // grid index range (integers)
    const gx0 = Math.floor(minX / GRID), gy0 = Math.floor(minY / GRID);
    const gx1 = Math.ceil(maxX / GRID), gy1 = Math.ceil(maxY / GRID);

    // Build velocity for sigma/weight heuristics if needed
    const vel = this.buildVelocityMap(now, clusters);

    // Pass 1: accumulate raw pressure per cell (gaussian by distance; weight by cohesion * size)
    const pMap = new Map<string, number>();
    const K_MIN = FIELD_LOD.K_MIN;

    const addP = (key: string, v: number) => pMap.set(key, (pMap.get(key) ?? 0) + v);

    for (let gy = gy0; gy <= gy1; gy++) {
      for (let gx = gx0; gx <= gx1; gx++) {
        const cx = gx * GRID, cy = gy * GRID;
        let p = 0;

        for (const c of clusters) {
          if ((c.count ?? 0) < K_MIN) continue;

          const dx = c.x - cx, dy = c.y - cy;
          const d2 = dx * dx + dy * dy;

          // influence radius ~ cluster size; clamp lower bound
          const sigma = Math.max(c.r, 40);
          const wSpatial = Math.exp(-d2 / (2 * sigma * sigma));

          const coh = Math.min(1, Math.max(0, c.cohesionScore ?? 0.5));
          const sizeW = Math.min(1, (c.count ?? 0) / 20);
          const wAttr = 0.3 + 0.7 * coh * sizeW;

          const v = wSpatial * wAttr;
          if (v > 1e-4) p += v;
        }

        if (p <= 0) continue;

        // EMA smoothing (pressureEma keyed by cell)
        const key = this.cellKey(gx, gy);
        const prev = this.pressureEma.get(key);
        const alpha = P3B.PRESSURE.SMOOTH;
        const smoothed = prev == null ? p : (alpha * prev + (1 - alpha) * p);
        this.pressureEma.set(key, smoothed);
        addP(key, smoothed);
      }
    }

    // Pass 2: central differences to derive gradients
    const cells: PressureCell[] = [];
    const toP = (x: number, y: number) => pMap.get(this.cellKey(x, y)) ?? 0;

    for (let gy = gy0; gy <= gy1; gy++) {
      for (let gx = gx0; gx <= gx1; gx++) {
        const key = this.cellKey(gx, gy);
        const p = pMap.get(key);
        if (p == null) continue;

        // central diff (scaled by grid size)
        const left = toP(gx - 1, gy), right = toP(gx + 1, gy);
        const up = toP(gx, gy - 1), down = toP(gx, gy + 1);

        // gradient = ∇p (positive means increasing). We'll use -∇p for wind direction.
        const gxv = (right - left) / (2 * GRID);
        const gyv = (down - up) / (2 * GRID);

        const cx = gx * GRID, cy = gy * GRID;
        cells.push({ x: cx, y: cy, p, gx: gxv, gy: gyv });
        if (cells.length >= P3B.PRESSURE.MAX_CELLS) break;
      }
      if (cells.length >= P3B.PRESSURE.MAX_CELLS) break;
    }

    // Sort by pressure magnitude and cap
    cells.sort((a, b) => b.p - a.p);
    this.lastPressureCells = cells.slice(0, P3B.PRESSURE.MAX_CELLS);
    
    // Evict old EMA cells to prevent memory leaks
    const live = new Set(this.lastPressureCells.map(c => 
      `${Math.round(c.x / P3B.PRESSURE.GRID_PX)}:${Math.round(c.y / P3B.PRESSURE.GRID_PX)}`
    ));
    for (const key of this.pressureEma.keys()) {
      if (!live.has(key)) this.pressureEma.delete(key);
    }
    
    this.lastPressureTs = now;
    return this.lastPressureCells;
  }

  /** Phase 3B: Storm groups from convergence lanes */
  stormGroups(lanes: LaneSegment[], zoom: number): StormGroup[] {
    const out: StormGroup[] = [];
    if (zoom < P3B.STORMS.MIN_ZOOM || lanes.length === 0) return out;

    // Filter strong lanes
    const strong = lanes.filter(l =>
      l.conf >= P3B.STORMS.CONF_MIN && l.etaMs <= P3B.STORMS.ETA_MAX_MS
    );
    if (!strong.length) return out;

    // Spatial hashing around lane endpoints (use lane end as meet point proxy)
    const R = P3B.STORMS.GROUP_RADIUS_PX;
    const invR = 1 / R;
    const bins = new Map<string, LaneSegment[]>();
    const keyFor = (x: number, y: number) => `${Math.round(x * invR)}:${Math.round(y * invR)}`;

    for (const ln of strong) {
      const end = ln.pts[ln.pts.length - 1];
      const key = keyFor(end.x, end.y);
      (bins.get(key) ?? bins.set(key, []).get(key)!).push(ln);
    }

    // Build groups per bin; compute intensity = normalized count * avg conf
    for (const [k, list] of bins) {
      if (!list.length) continue;

      const endPts = list.map(l => l.pts[l.pts.length - 1]);
      const cx = endPts.reduce((s, p) => s + p.x, 0) / endPts.length;
      const cy = endPts.reduce((s, p) => s + p.y, 0) / endPts.length;

      const confAvg = list.reduce((s, l) => s + l.conf, 0) / list.length;
      const etaAvg = list.reduce((s, l) => s + l.etaMs, 0) / list.length;

      // radius tied to spread; clamp
      const spread = Math.sqrt(
        endPts.reduce((s, p) => s + ((p.x - cx) ** 2 + (p.y - cy) ** 2), 0) / endPts.length
      );
      const radius = Math.max(32, Math.min(160, spread * 1.2));

      // intensity = confAvg scaled by lane density (soft log)
      const intensity = Math.max(0, Math.min(1, confAvg * Math.log(2 + list.length) / Math.log(10)));

      out.push({
        id: `storm_${k}`,
        x: cx, y: cy,
        radius,
        intensity,
        conf: confAvg,
        etaMs: etaAvg,
      });
      if (out.length >= P3B.STORMS.MAX_GROUPS) break;
    }

    return out;
  }
}

// Persistent worker instance
const workerInstance = new ClusteringWorker();

const api = {
  cluster: (tiles: RawTile[], zoom = 11) => workerInstance.cluster(tiles, zoom),
  hitTest: (x: number, y: number, radius = 12) => workerInstance.hitTest(x, y, radius),
  signals: (curr: SocialCluster[], zoom: number, now = performance.now()) => workerInstance.signals(curr, zoom, now),
  reset: () => workerInstance.reset(),
  // Phase 3 API extensions
  flowGrid: (clusters: SocialCluster[], zoom: number) => workerInstance.flowGrid(clusters, zoom),
  lanes: (clusters: SocialCluster[], zoom: number, now = performance.now()) => workerInstance.lanes(clusters, zoom, now),
  momentum: (clusters: SocialCluster[]) => workerInstance.momentum(clusters),
  // Phase 3B API extensions (atmospheric)
  pressureGrid: (clusters: SocialCluster[], zoom: number) => workerInstance.pressureGrid(clusters, zoom),
  stormGroups: (lanes: LaneSegment[], zoom: number) => workerInstance.stormGroups(lanes, zoom),
};

Comlink.expose(api);