export function buildTimelinePath(moments: any[]): string {
  if (moments.length === 0) return '';
  
  const width = 8;             // curve x-offset
  const heightUnit = 120;      // each moment's vertical space
  const cps: { x: number; y: number }[] = [];

  moments.forEach((m, i) => {
    const y = i * heightUnit;
    const intensity = m.vibe_intensity ?? 0.5;        // 0-1
    const amplitude = 26 * intensity;                 // tweak
    const direction = i % 2 === 0 ? 1 : -1;
    cps.push({ x: width / 2 + amplitude * direction, y });
  });

  return cpToSvgPath(cps);
}

function cpToSvgPath(controlPoints: { x: number; y: number }[]): string {
  if (controlPoints.length === 0) return '';
  if (controlPoints.length === 1) {
    const { x, y } = controlPoints[0];
    return `M ${x} ${y}`;
  }

  let path = `M ${controlPoints[0].x} ${controlPoints[0].y}`;
  
  for (let i = 1; i < controlPoints.length; i++) {
    const curr = controlPoints[i];
    const prev = controlPoints[i - 1];
    
    // Calculate control points for smooth curve
    const cp1x = prev.x + (curr.x - prev.x) * 0.3;
    const cp1y = prev.y + (curr.y - prev.y) * 0.3;
    const cp2x = curr.x - (curr.x - prev.x) * 0.3;
    const cp2y = curr.y - (curr.y - prev.y) * 0.3;
    
    path += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${curr.x} ${curr.y}`;
  }
  
  return path;
}