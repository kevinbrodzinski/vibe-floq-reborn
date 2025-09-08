/**
 * Cascade Hotspot Detection
 * Groups nearby convergences to find cascade events (≥3 actors converging)
 */

import type { CascadeEvent } from '@/components/field/overlays/ProximityCascadeOverlay';

type Convergence = { 
  id: string; 
  meeting: { x: number; y: number }; 
  etaMs: number; 
  confidence: number; 
};

export function detectCascadeHotspots(convs: Convergence[], {
  maxDistPx = 80, 
  minActors = 3, 
  maxEtaMs = 120_000
} = {}): CascadeEvent[] {
  if (!convs?.length) return [];
  
  const byCell = new Map<string, Convergence[]>();
  const cell = (x: number, y: number) => `${Math.round(x / maxDistPx)}:${Math.round(y / maxDistPx)}`;

  // Group convergences by proximity grid
  for (const c of convs) {
    if (c.etaMs > maxEtaMs) continue;
    const k = cell(c.meeting.x, c.meeting.y);
    const existing = byCell.get(k);
    if (existing) {
      existing.push(c);
    } else {
      byCell.set(k, [c]);
    }
  }

  const out: CascadeEvent[] = [];
  
  // Find cells with enough actors for cascade
  for (const [k, list] of byCell) {
    if (list.length < minActors) continue;
    
    // Calculate centroid and weight
    let sx = 0, sy = 0, w = 0;
    for (const c of list) { 
      sx += c.meeting.x; 
      sy += c.meeting.y; 
      w += c.confidence; 
    }
    
    const cx = sx / list.length;
    const cy = sy / list.length;
    const weight = Math.min(1, (list.length / 5) * (w / list.length));
    
    out.push({ 
      id: `CAS_${k}`, 
      x: cx, 
      y: cy, 
      weight 
    });
  }
  
  return out;
}