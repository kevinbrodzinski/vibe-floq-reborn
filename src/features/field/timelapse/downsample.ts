/**
 * Downsampling utilities for time-lapse buffer
 * Converts field data to compact typed arrays
 */

export function downsampleFlows(
  cells: Array<{ x: number; y: number; vx: number; vy: number }>,
  stridePx = 72, 
  maxCells = 256
): Float32Array {
  if (!cells?.length) return new Float32Array(0);
  
  const pick: number[] = [];
  const seen = new Set<string>();
  
  // Spatial deduplication using stride grid
  for (let i = 0; i < cells.length && pick.length < maxCells; i++) {
    const c = cells[i];
    const k = `${Math.round(c.x / stridePx)}:${Math.round(c.y / stridePx)}`;
    if (seen.has(k)) continue;
    seen.add(k); 
    pick.push(i);
  }
  
  // Pack into typed array: [x,y,vx,vy] * N
  const out = new Float32Array(pick.length * 4);
  let j = 0; 
  for (const i of pick) { 
    const c = cells[i]; 
    out[j++] = c.x; 
    out[j++] = c.y; 
    out[j++] = c.vx; 
    out[j++] = c.vy; 
  }
  
  return out;
}

export function downsampleStorms(
  storms: Array<{ x: number; y: number; intensity: number }>,
  maxStorms = 32
): Float32Array {
  if (!storms?.length) return new Float32Array(0);
  
  // Take top storms by intensity, up to maxStorms
  const sorted = storms
    .slice()
    .sort((a, b) => (b.intensity || 0) - (a.intensity || 0));
  const pick = sorted.slice(0, maxStorms);
  
  // Pack into typed array: [x,y,intensity] * N
  const out = new Float32Array(pick.length * 3);
  let j = 0; 
  for (const s of pick) { 
    out[j++] = s.x; 
    out[j++] = s.y; 
    out[j++] = s.intensity; 
  }
  
  return out;
}

/**
 * Convert typed flows back to wind paths for overlay rendering
 */
export function typedFlowsToWindPaths(flows: Float32Array, scale = 60): Array<{
  id: string;
  points: Array<{ x: number; y: number }>;
  intensity: number;
}> {
  const paths = [];
  
  // Read flows array in strides of 4: [x,y,vx,vy]
  for (let i = 0; i < flows.length; i += 4) {
    const x = flows[i];
    const y = flows[i + 1];
    const vx = flows[i + 2];
    const vy = flows[i + 3];
    
    if (!x && !y && !vx && !vy) continue; // Skip empty entries
    
    const intensity = Math.min(1, Math.hypot(vx, vy));
    
    paths.push({
      id: `flow_${i / 4}`,
      points: [
        { x, y },
        { x: x + vx * scale, y: y + vy * scale }
      ],
      intensity
    });
  }
  
  return paths;
}