export type LatLng = { lat: number; lng: number };

export type FlowRow = {
  started_at: string;              // ISO
  ended_at?: string | null;        // ISO
  sun_exposed_min?: number | null; // minutes (may be null)
};

export type FlowSegmentRow = {
  idx: number;
  arrived_at: string;               // ISO
  departed_at?: string | null;      // ISO
  center?: LatLng | null;
  venue_id?: string | null;
  vibe_vector?: { energy?: number; valence?: number } | null;
};

export type PaceBuckets = {
  strollMin: number;  // < strollMin => "stroll"
  steadyMin: number;  // [strollMin..steadyMin)
  briskMin: number;   // [steadyMin..briskMin)
  rushMin: number;    // >= rushMin => "rush"
};
export type PaceCount = { stroll: number; steady: number; brisk: number; rush: number };

export type VenueDwell = { venue_id: string; totalMin: number; visits: number; };
export type TopVenue = VenueDwell & { rank: number };

export type SegmentSummary = {
  idx: number;
  dwellMin: number;                // dwell within the segment
  paceMPerMin?: number | null;     // pace to *next* segment (null for last)
  venue_id?: string | null;
  energy?: number | null;
  valence?: number | null;
};

export type FlowMetrics = {
  elapsedMin: number;               // minutes
  distanceM: number;                // meters
  suiPct: number | null;            // 0..100 (rounded) or null
  pace: { avgMPerMin: number | null; buckets: PaceCount };
  segments: SegmentSummary[];
  venues: {
    byId: Record<string, VenueDwell>;
    top: TopVenue[];
    count: number;
    discovered: number;
  };
  path: LatLng[];                   // polyline for map overlay
  energySamples: Array<{ t: number; energy: number }>;
};

const DEFAULT_PACE: PaceBuckets = {
  strollMin: 60,   // <60 m/min
  steadyMin: 100,  // 60..100
  briskMin: 160,   // 100..160
  rushMin: 200,    // >=200 (ensure rush > brisk)
};

const toMs = (v: string | number | Date) =>
  typeof v === 'number' ? v : (v instanceof Date ? v.getTime() : new Date(v).getTime());

export function computeFlowMetrics(
  flow: FlowRow,
  segments: FlowSegmentRow[],
  opts?: { pace?: Partial<PaceBuckets>; maxTopVenues?: number }
): FlowMetrics {
  const paceCfg: PaceBuckets = { ...DEFAULT_PACE, ...(opts?.pace ?? {}) };
  const maxTop = Math.max(1, Math.min(10, opts?.maxTopVenues ?? 5));

  // sort defensively
  const segs = [...segments].sort((a, b) => (a.idx ?? 0) - (b.idx ?? 0));

  
  const haversineM = (a: LatLng, b: LatLng) => {
    const R = 6371000, toRad = (x: number) => x * Math.PI / 180;
    const dLat = toRad(b.lat - a.lat), dLng = toRad(b.lng - a.lng);
    const s1 = Math.sin(dLat / 2) ** 2, s2 = Math.sin(dLng / 2) ** 2;
    const c = 2 * Math.asin(Math.sqrt(s1 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * s2));
    return R * c;
  };

  // elapsed
  const startMs = toMs(flow.started_at);
  const endMs = flow.ended_at ? toMs(flow.ended_at) : Date.now();
  const elapsedMin = Math.max(0, (endMs - startMs) / 60000);

  // accumulators
  let distanceM = 0;
  const path: LatLng[] = [];
  const segmentsOut: SegmentSummary[] = [];
  const venuesAgg = new Map<string, VenueDwell>();
  const seenVenues = new Set<string>();
  let discovered = 0;
  const paceBuckets: PaceCount = { stroll: 0, steady: 0, brisk: 0, rush: 0 };

  const getCenter = (c: LatLng | null) => (c && isFinite(c.lat) && isFinite(c.lng) ? c : null);

  for (let i = 0; i < segs.length; i++) {
    const s = segs[i];
    const next = segs[i + 1];
    const center = getCenter(s.center);
    if (center) path.push(center);

    // dwell
    const arrived = toMs(s.arrived_at);
    const departed = next ? toMs(next.arrived_at) : (s.departed_at ? toMs(s.departed_at) : arrived);
    const dwellMin = Math.max(0, (departed - arrived) / 60000);

    // pace to next
    let paceMPerMin: number | null = null;
    if (center && next?.center && getCenter(next.center)) {
      const dist = haversineM(center, next.center!);
      const dtMin = Math.max(0.01, (toMs(next.arrived_at) - arrived) / 60000);
      paceMPerMin = dist / dtMin;
      distanceM += dist;

      // bucket
      if (paceMPerMin < paceCfg.strollMin) paceBuckets.stroll++;
      else if (paceMPerMin < paceCfg.steadyMin) paceBuckets.steady++;
      else if (paceMPerMin < paceCfg.briskMin) paceBuckets.brisk++;
      else paceBuckets.rush++;
    }

    // venue dwell
    if (s.venue_id) {
      const vd = venuesAgg.get(s.venue_id) ?? { venue_id: s.venue_id, totalMin: 0, visits: 0 };
      vd.totalMin += dwellMin;
      vd.visits += 1;
      venuesAgg.set(s.venue_id, vd);
      if (!seenVenues.has(s.venue_id)) { discovered++; seenVenues.add(s.venue_id); }
    }

    segmentsOut.push({
      idx: s.idx,
      dwellMin,
      paceMPerMin,
      venue_id: s.venue_id ?? null,
      energy: isFinite(s.vibe_vector?.energy ?? NaN) ? s.vibe_vector!.energy! : null,
      valence: isFinite(s.vibe_vector?.valence ?? NaN) ? s.vibe_vector!.valence! : null,
    });
  }

  const avgMPerMin = distanceM > 0 && elapsedMin > 0 ? distanceM / elapsedMin : null;
  const suiPct =
    typeof flow.sun_exposed_min === 'number' && elapsedMin > 0
      ? Math.round(100 * Math.min(1, Math.max(0, flow.sun_exposed_min / elapsedMin)))
      : null;

  const venuesArray = Array.from(venuesAgg.values()).sort(
    (a, b) => b.totalMin - a.totalMin || b.visits - a.visits
  );
  const top = venuesArray.slice(0, maxTop).map((v, i) => ({ ...v, rank: i + 1 }));

  const energySamples = segs
    .map(s => {
      const e = s.vibe_vector?.energy;
      return isFinite(e ?? NaN) ? { t: toMs(s.arrived_at), energy: Math.max(0, Math.min(1, e!)) } : null;
    })
    .filter(Boolean) as Array<{ t: number; energy: number }>;

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
      discovered,
    },
    path,
    energySamples,
  };
}