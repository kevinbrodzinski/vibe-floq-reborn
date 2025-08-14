// Normalizes any "score" shape into a 0–100 integer percent.
export function normalizeScoreToPercent(input?: number | null): number | null {
  if (input == null || Number.isNaN(input as number)) return null;
  const x = Number(input);

  // Heuristics to handle common mis-scalings
  if (x <= 1) return Math.round(Math.max(0, Math.min(1, x)) * 100); // 0–1
  if (x <= 5) return Math.round((x / 5) * 100);                      // 0–5 stars
  if (x <= 100) return Math.round(x);                                 // already %
  // Anything wild (e.g., 5000) → clamp
  return 100;
}

// Distance formatting
export function formatDistance(distance_m?: number | string | null): string {
  if (distance_m == null) return '';
  const d = Number(distance_m);
  if (!Number.isFinite(d)) return '';
  if (d < 1000) return `${Math.round(d)}m`;
  return `${(d / 1000).toFixed(d < 5000 ? 1 : 0)}km`;
}

// Simple travel time estimates (heuristics, not live traffic)
// Walk ~ 4.8 km/h, Drive (urban) ~ 27 km/h with a min of 2 minutes.
export function estimateWalkMinutes(distance_m?: number | string | null): number | null {
  if (distance_m == null) return null;
  const d = Number(distance_m);
  if (!Number.isFinite(d)) return null;
  const walkMin = Math.ceil(d / 80); // 80 m/min ≈ 4.8 km/h
  return Math.max(1, walkMin);
}

export function estimateDriveMinutes(distance_m?: number | string | null): number | null {
  if (distance_m == null) return null;
  const d = Number(distance_m);
  if (!Number.isFinite(d)) return null;
  const driveMin = Math.ceil((d / 1000) / 27 * 60); // 27 km/h
  return Math.max(2, driveMin); // enforce a realistic floor
}

export function minToLabel(min?: number | null): string {
  if (min == null) return '';
  return `${min} min`;
}

// Makes underscore categories pretty
export function prettyCategory(raw?: string | null): string {
  if (!raw) return '';
  return raw.replace(/_/g, ' ');
}