// Client-side postcard generator
export async function generatePostcardClient(flow: {
  path?: Array<{ lng: number; lat: number }>;
  stats: { 
    distanceM: number; 
    elapsedMin: number; 
    suiPct?: number | null; 
    venues: number 
  };
  title: string;
}): Promise<Blob> {
  const size = 1080;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;

  // Background gradient
  const g = ctx.createLinearGradient(0, 0, size, size);
  g.addColorStop(0, '#0f1024');
  g.addColorStop(1, '#1a1c44');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);

  // Title
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 58px Inter, system-ui, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText(flow.title, 60, 120);

  // Stats
  ctx.font = '26px Inter, system-ui, sans-serif';
  const y0 = 180;
  ctx.fillText(`Distance: ${(flow.stats.distanceM / 1000).toFixed(2)} km`, 60, y0);
  ctx.fillText(`Elapsed:  ${Math.round(flow.stats.elapsedMin)} min`, 60, y0 + 36);
  if (flow.stats.suiPct != null) {
    ctx.fillText(`SUI:      ${flow.stats.suiPct}%`, 60, y0 + 72);
  }
  ctx.fillText(`Venues:   ${flow.stats.venues}`, 60, y0 + 108);

  // Path visualization (simplified)
  if (flow.path?.length && flow.path.length > 1) {
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 6;
    ctx.lineCap = 'round';
    
    const pad = 120;
    const xs = pad;
    const ys = pad + 150; // Offset for stats
    const w = size - 2 * pad;
    const h = size - 2 * pad - 150;
    
    const lngs = flow.path.map(p => p.lng);
    const lats = flow.path.map(p => p.lat);
    const minx = Math.min(...lngs);
    const maxx = Math.max(...lngs);
    const miny = Math.min(...lats);
    const maxy = Math.max(...lats);
    
    const sx = (v: number) => xs + (w * (v - minx)) / Math.max(1e-9, (maxx - minx) || 1);
    const sy = (v: number) => ys + (h * (maxy - v)) / Math.max(1e-9, (maxy - miny) || 1);
    
    ctx.beginPath();
    flow.path.forEach((p, i) => {
      if (i === 0) {
        ctx.moveTo(sx(p.lng), sy(p.lat));
      } else {
        ctx.lineTo(sx(p.lng), sy(p.lat));
      }
    });
    ctx.stroke();

    // Start and end points
    ctx.fillStyle = '#4ade80';
    ctx.beginPath();
    ctx.arc(sx(flow.path[0].lng), sy(flow.path[0].lat), 8, 0, 2 * Math.PI);
    ctx.fill();

    ctx.fillStyle = '#ef4444';
    ctx.beginPath();
    ctx.arc(sx(flow.path[flow.path.length - 1].lng), sy(flow.path[flow.path.length - 1].lat), 8, 0, 2 * Math.PI);
    ctx.fill();
  }

  // Branding
  ctx.fillStyle = 'rgba(255,255,255,0.6)';
  ctx.font = '20px Inter, system-ui, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('FLOQ', size - 60, size - 60);

  return new Promise(resolve => 
    canvas.toBlob(b => resolve(b!), 'image/png', 0.92)
  );
}