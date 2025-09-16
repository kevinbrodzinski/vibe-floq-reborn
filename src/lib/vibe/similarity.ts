// Single source for vibe vectors + similarity (token-first, no hex)
// Usage:
//   import { toFloqVector, similarity } from "@/lib/vibe/similarity";
//   const sim = similarity(userVibe.vector, floqItem);

export type VibeVector = [number, number, number];

export function normalize(v: number[]): VibeVector {
  const s = Math.sqrt(v[0]*v[0] + v[1]*v[1] + v[2]*v[2]) || 1;
  return [v[0]/s, v[1]/s, v[2]/s];
}

export function keyToVector(key?: string): VibeVector {
  switch ((key || "").toLowerCase()) {
    case "chill":  return [1,0,0];
    case "social": return [0,1,0];
    case "hype":   return [0,0,1];
    default:       return normalize([0.33, 0.34, 0.33]); // neutral
  }
}

/** Return a normalized floq vector using (in order): explicit vector, key, or derived fallback. */
export function toFloqVector(f: any): VibeVector {
  // 1) explicit engine vector
  if (Array.isArray(f?.vibe_vector) && f.vibe_vector.length === 3) {
    const [a,b,c] = f.vibe_vector.map(Number);
    return normalize([a,b,c]);
  }
  // 2) primary vibe key (chill|social|hype)
  if (typeof f?.vibe === "string") return keyToVector(f.vibe);

  // 3) light derivation: energy tilts hype; participants/friends tilt social; the rest chill
  const energy = clamp01(Number(f?.energy_now ?? 0.5));
  const social = clamp01(((Number(f?.participants ?? 0) + Number(f?.friends_in ?? 0)) / 200));
  const chill  = Math.max(0, 1 - Math.max(energy, social));
  return normalize([chill, social, energy]);
}

export function similarity(userVec: VibeVector, floq: any): number {
  const fv = toFloqVector(floq);
  return clamp01(userVec[0]*fv[0] + userVec[1]*fv[1] + userVec[2]*fv[2]);
}

export function clamp01(x: number) { return Math.max(0, Math.min(1, x)); }