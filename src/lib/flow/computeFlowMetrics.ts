// src/lib/flow/computeFlowMetrics.ts
// Computes: distance, elapsed, dwell times (per segment & per venue),
// pace buckets, top venues, optional SUI %, and a simple path.
// Safe with partial/missing fields; all units documented below.

export type LatLng = { lng: number; lat: number };

export type FlowSegmentRow = {
  idx: number;
  arrived_at: string;          // ISO
  departed_at?: string | null; // ISO
  center?: LatLng | null;      // {lng,lat} (client should coerce)
  venue_id?: string | null;
  vibe_vector?: { energy?: number; valence?: number } | null;
};

export type FlowRow = {
  started_at: string;          // ISO
  ended_at?: string | null;    // ISO (may be null if running)
  sun_exposed_min?: number | null; // came from DB (optional)
};

export type PaceBuckets = {
  strollMin: number;  // m/min upper bound for "stroll"
  steadyMin: number;  // lower bound steady; next threshold is briskMin
  briskMin: number;   // lower bound brisk; >= rushMin is rush
  rushMin: number;    // lower bound rush
};

export type PaceCount = {
  stroll: number;
  steady: number;
  brisk: number;
  rush: number;
};

export type VenueDwell = {
  venue_id: string;
  totalMin: number;
  visits: number;
};

export type SegmentSummary = {
  idx: number;
  dwellMin: number;              // minutes
  paceMPerMin?: number | null;   // pace to next segment (null for last)
  venue_id?: string | null;
  energy?: number | null;
  valence?: number | null;
};

export type FlowMetrics = {
  elapsedMin: number;            // minutes
  distanceM: number;             // meters
  suiPct?: number | null;        // 0..100 or null
  pace: {
    avgMPerMin?: number | null;
    buckets: PaceCount;
  };
  segments: SegmentSummary[];
  venues: {
    byId: Record<string, VenueDwell>;
    top: Array<VenueDwell & { rank: number }>;
    count: number;
    discovered: number;          // visits with venue_id not seen before in this flow
  };
  path: LatLng[];                // ordered line for rendering
  energySamples: Array<{ t: number; energy: number }>; // for charts
};

const DEFAULT_PACE: PaceBuckets = {
  strollMin: 60,  // <60 m/min (very casual ~ 3.6 km/h)
  steadyMin: 100, // 60..100 (normal walk)
  briskMin: 160,  // 100..160 (brisk walk)
  rushMin: 160,   // >=160 m/min (running / fast move)
};

export function computeFlowMetrics(
  flow: FlowRow,
  segments: FlowSegmentRow[],
  opts?: { pace?: Partial<PaceBuckets>; maxTopVenues?: number }
): FlowMetrics {
  const pc = { ...DEFAULT_PACE, ...(opts?.pace ?? {}) };
  const maxTop = Math.max(1, Math.min(10, opts?.maxTopVenues ?? 5));

  // Sort by idx to be safe
  const segs = [...segments].sort((a,b)=> (a.idx ?? 0) - (b.idx ?? 0));

  // Helpers
  const toMs = (iso: string) => new Date(iso).getTime();
  const haversineM = (a: LatLng, b: LatLng) => {
    const R=6371000, toRad=(x:number)=>x*Math.PI/180;
    const dLat=toRad(b.lat-a.lat), dLng=toRad(b.lng-a.lng);
    const s1=Math.sin(dLat/2)**2, s2=Math.sin(dLng/2)**2;
    const c=2*Math.asin(Math.sqrt(s1+Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*s2));
    return R*c;
  };

  // Elapsed
  const startMs = toMs(flow.started_at);
  const endMs   = flow.ended_at ? toMs(flow.ended_at) : Date.now();
  const elapsedMin = Math.max(0, (endMs - startMs)/60000);

  // Iterate for distance, dwell, pace, venues
  let distanceM = 0;
  const path: LatLng[] = [];
  const segmentsOut: SegmentSummary[] = [];
  const venuesAgg = new Map<string, VenueDwell>();
  const seenVenues = new Set<string>();
  let discovered = 0;

  // pace buckets
  const paceBuckets: PaceCount = { stroll:0, steady:0, brisk:0, rush:0 };
  const parseCenter = (c?: LatLng|null) => (c && isFinite(c.lng) && isFinite(c.lat)) ? c : null;

  for (let i=0;i<segs.length;i++){
    const s = segs[i];
    const n = segs[i+1] || null;

    const a = parseCenter(s.center);
    if (a) path.push(a);

    // dwell per segment
    const aMs = toMs(s.arrived_at);
    const dMs = s.departed_at ? toMs(s.departed_at) : aMs;
    const dwellMin = Math.max(0, (dMs - aMs)/60000);

    // pace to next segment
    let pace: number | null = null;
    if (a && n && parseCenter(n.center)) {
      const b = parseCenter(n.center)!;
      const gapMin = Math.max(0.0001, (toMs(n.arrived_at) - aMs)/60000); // avoid div by zero
      const dist = haversineM(a, b);
      distanceM += dist;
      pace = dist / gapMin; // m/min

      if (pace < pc.strollMin) paceBuckets.stroll++;
      else if (pace < pc.steadyMin) paceBuckets.steady++;
      else if (pace < pc.briskMin) paceBuckets.brisk++;
      else paceBuckets.rush++;
    }

    // venues dwell
    if (s.venue_id) {
      const v = venuesAgg.get(s.venue_id) ?? { venue_id: s.venue_id, totalMin: 0, visits: 0 };
      v.totalMin += dwellMin;
      v.visits += 1;
      venuesAgg.set(s.venue_id, v);
      if (!seenVenues.has(s.venue_id)) {
        discovered += 1;
        seenVenues.add(s.venue_id);
      }
    }

    segmentsOut.push({
      idx: s.idx,
      dwellMin,
      paceMPerMin: pace,
      venue_id: s.venue_id ?? null,
      energy: s.vibe_vector?.energy ?? null,
      valence: s.vibe_vector?.valence ?? null,
    });
  }

  // Avg pace
  const paceObs = (paceBuckets.stroll + paceBuckets.steady + paceBuckets.brisk + paceBuckets.rush);
  const avgMPerMin = distanceM > 0 && elapsedMin > 0 ? (distanceM / elapsedMin) : null;

  // SUI percentage (prefer DB value; fallback NULL if we can't calculate fairly)
  const suiPct = (typeof flow.sun_exposed_min === 'number' && elapsedMin > 0)
    ? Math.round(100 * Math.min(1, Math.max(0, flow.sun_exposed_min / elapsedMin)))
    : null;

  // Top venues
  const venuesArray = Array.from(venuesAgg.values())
    .sort((a,b) => (b.totalMin - a.totalMin) || b.visits - a.visits);
  const top = venuesArray.slice(0, maxTop).map((v, i)=> ({ ...v, rank: i+1 }));

  // Energy samples for chart
  const energySamples = segs
    .map(s => {
      const e = s.vibe_vector?.energy;
      return (typeof e === 'number' && isFinite(e))
        ? { t: toMs(s.arrived_at), energy: Math.max(0, Math.min(1, e)) }
        : null;
    })
    .filter(Boolean) as Array<{t:number; energy:number}>;

  return {
    elapsedMin,
    distanceM,
    suiPct,
    pace: { avgMPerMin, buckets: paceBuckets },
    segments: segmentsOut,
    venues: {
      byId: Object.fromEntries(venuesArray.map(v => [v.venue_id, v])),
      top,
      count: venuesArray.length,
      discovered
    },
    path,
    energySamples,
  };
}