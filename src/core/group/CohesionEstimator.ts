// Group-level cohesion / fragmentation from member energies & compat.
export type MemberSignal = { energy: number }; // extend later with style, rhythm, etc.

export function estimateCohesion(members: MemberSignal[]) {
  if (!members.length) return { energy: 0, cohesion: 0, fragmentationRisk: 1 };
  const energies = members.map(m => m.energy);
  const mean = avg(energies);
  const variance = avg(energies.map(e => (e - mean) ** 2));
  const cohesion = clamp01(1 - variance / 0.25);     // variance 0.25 → cohesion 0
  const fragmentationRisk = clamp01(variance * 1.5); // heuristic
  return { energy: mean, cohesion, fragmentationRisk };
}

const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / Math.max(1, a.length);
const clamp01 = (x: number) => Math.max(0, Math.min(1, x));