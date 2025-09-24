// Minimal deps: Browser Canvas API only.
// Usage:
//   const blob = await generatePostcardClient({ path, stats, energySamples, title: 'Sunset Flow', subtitle:'Venice', date:new Date() });
//   download or navigator.share with the Blob.

import { tokens } from '@/design/tokens';

export type LatLng = { lat: number; lng: number };

export type PostcardStats = {
  distanceM: number;     // meters
  elapsedMin: number;    // minutes
  suiPct?: number | null;// 0..100
  venues?: number;       // count
};

export type EnergySample = { t: number | Date; energy: number }; // 0..1

export type PostcardOptions = {
  size?: number; // square px (CSS pixels) — default 1080
  title: string;
  subtitle?: string;
  date?: Date;

  path: LatLng[];                    // Flow polyline (ordered)
  stats: PostcardStats;
  energySamples?: EnergySample[];    // for sparkline (optional)

  // Visuals
  background?: {                     // optional image background
    url: string;
    opacity?: number;                // 0..1
    blurPx?: number;                 // e.g. 12
  };
  palette?: {
    bgA?: string;    // gradient start
    bgB?: string;    // gradient end
    glow?: string;   // path glow color
    path?: string;   // path stroke color
    ink?: string;    // text color
    chipBg?: string; // chip background
    chipInk?: string;// chip text
    brand?: string;  // corner branding
  };
  branding?: 'subtle' | 'off';
};

const DEFAULT_PALETTE = {
  bgA: tokens.color.bg,
  bgB: tokens.color.bgAlt,
  glow: 'rgba(155, 135, 245, 0.75)', // accent color glow
  path: tokens.color.ink,
  ink: tokens.color.ink,
  chipBg: tokens.color.chipBg,
  chipInk: tokens.color.chipInk,
  brand: 'rgba(155, 135, 245, 0.6)', // accent color for branding
};

export async function generatePostcardClient(opts: PostcardOptions): Promise<Blob> {
  const size = Math.max(512, Math.min(2048, opts.size ?? 1080));
  const dpr = Math.min(window.devicePixelRatio || 1, 3);
  const px = Math.round(size * dpr);

  const palette = { ...DEFAULT_PALETTE, ...(opts.palette ?? {}) };
  const title = (opts.title || '').trim();
  const subtitle = (opts.subtitle || '').trim();
  const dateStr = opts.date ? opts.date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' }) : '';

  // Canvas
  const canvas = document.createElement('canvas');
  canvas.width = px;
  canvas.height = px;
  canvas.style.width = `${size}px`;
  canvas.style.height = `${size}px`;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = 'high';

  // ---------- Background ----------
  drawGradientBackground(ctx, size, palette.bgA, palette.bgB);

  if (opts.background?.url) {
    try {
      // CORS note: asset must be CORS-enabled for toBlob; otherwise skip.
      const img = await loadImage(opts.background.url);
      drawCoverImage(ctx, img, size, size, opts.background.opacity ?? 0.25, opts.background.blurPx ?? 14);
    } catch {
      // ignore image failures — gradient is fine
    }
  }

  // Soft radial glow behind path area
  radialGlow(ctx, size, palette.glow);

  // ---------- Path ----------
  // Fit lat/lng path into the card's inner rect with padding
  const PAD = Math.round(size * 0.12);
  const inner = { x: PAD, y: PAD + 8, w: size - PAD * 2, h: size - PAD * 2 - 160 }; // leave room for stats/footer
  const screenPath = fitPathToRect(opts.path, inner);

  // Path glow
  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  // dual pass glow
  ctx.shadowColor = palette.glow;
  ctx.shadowBlur = 24;
  ctx.strokeStyle = palette.glow;
  ctx.lineWidth = 10;
  strokePath(ctx, screenPath);

  // main stroke
  ctx.shadowBlur = 0;
  ctx.strokeStyle = palette.path;
  ctx.lineWidth = 4;
  strokePath(ctx, screenPath);

  // start/end markers
  if (screenPath.length > 0) {
    const start = screenPath[0], end = screenPath[screenPath.length - 1];
    drawDot(ctx, start.x, start.y, 5, 'rgba(255,255,255,0.8)');
    drawDot(ctx, end.x, end.y, 5, palette.glow);
  }
  ctx.restore();

  // ---------- Title / Subtitle ----------
  ctx.save();
  ctx.fillStyle = palette.ink;
  ctx.font = `700 ${clamp(28, size * 0.05, 48)}px ui-sans-serif, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial`;
  ctx.textBaseline = 'alphabetic';
  ctx.fillText(title, PAD, PAD - 8 + 40);

  if (subtitle || dateStr) {
    ctx.globalAlpha = 0.85;
    ctx.font = `500 ${clamp(16, size * 0.027, 24)}px ui-sans-serif, system-ui`;
    const sub = [subtitle, dateStr].filter(Boolean).join(' • ');
    ctx.fillText(sub, PAD, PAD - 8 + 40 + 26);
  }
  ctx.restore();

  // ---------- Vibe sparkline ----------
  const energy = (opts.energySamples ?? []).map(s => ({
    t: typeof s.t === 'number' ? s.t : (s.t instanceof Date ? s.t.getTime() : new Date(s.t).getTime()),
    energy: clamp01(s.energy ?? 0),
  }));
  if (energy.length > 1) {
    const chartRect = { x: PAD, y: inner.y + inner.h + 18, w: size - PAD * 2, h: 80 };
    drawSparkline(ctx, energy, chartRect, palette.path, 'rgba(255,255,255,0.12)');
    ctx.globalAlpha = 0.9;
    ctx.font = `600 ${clamp(12, size * 0.022, 16)}px ui-sans-serif, system-ui`;
    ctx.fillStyle = palette.ink;
    ctx.fillText('Energy Journey', chartRect.x, chartRect.y - 8);
    ctx.globalAlpha = 1;
  }

  // ---------- Stats chips ----------
  const chipY = size - 64 - 24;
  const chips = makeChips(opts.stats);
  drawStatChips(ctx, chips, { x: PAD, y: chipY }, palette);

  // ---------- Branding ----------
  if (opts.branding !== 'off') {
    ctx.save();
    ctx.font = `700 ${clamp(12, size * 0.022, 16)}px ui-sans-serif, system-ui`;
    ctx.fillStyle = palette.brand;
    const brand = 'floq';
    const m = ctx.measureText(brand);
    ctx.fillText(brand, size - PAD - m.width, size - PAD * 0.6);
    ctx.restore();
  }

  // ---------- Render to Blob ----------
  return await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(b => (b ? resolve(b) : reject(new Error('toBlob failed'))), 'image/png', 0.92);
  });
}

// ============ Drawing helpers ============

function drawGradientBackground(ctx: CanvasRenderingContext2D, size: number, c1: string, c2: string) {
  const g = ctx.createLinearGradient(0, 0, size, size);
  g.addColorStop(0, c1);
  g.addColorStop(1, c2);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
}

async function loadImage(url: string) {
  return new Promise<HTMLImageElement>((res, rej) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => res(img);
    img.onerror = rej;
    img.src = url;
  });
}

function drawCoverImage(
  ctx: CanvasRenderingContext2D,
  img: HTMLImageElement,
  w: number, h: number,
  opacity: number, blurPx: number
) {
  ctx.save();
  ctx.globalAlpha = Math.max(0, Math.min(1, opacity));
  // cover calc
  const r = Math.max(w / img.width, h / img.height);
  const dw = img.width * r;
  const dh = img.height * r;
  const dx = (w - dw) / 2;
  const dy = (h - dh) / 2;
  if ((ctx as any).filter !== undefined) (ctx as any).filter = `blur(${blurPx}px)`;
  ctx.drawImage(img, dx, dy, dw, dh);
  if ((ctx as any).filter !== undefined) (ctx as any).filter = 'none';
  ctx.restore();
}

function radialGlow(ctx: CanvasRenderingContext2D, size: number, color: string) {
  ctx.save();
  const g = ctx.createRadialGradient(size * 0.65, size * 0.42, 0, size * 0.65, size * 0.42, size * 0.6);
  g.addColorStop(0, color);
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.globalAlpha = 0.18;
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, size, size);
  ctx.restore();
}

function strokePath(ctx: CanvasRenderingContext2D, pts: { x: number; y: number }[]) {
  if (pts.length < 2) return;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();
}

function drawDot(ctx: CanvasRenderingContext2D, x: number, y: number, r: number, fill: string) {
  ctx.save();
  ctx.beginPath();
  ctx.fillStyle = fill;
  ctx.arc(x, y, r, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawSparkline(
  ctx: CanvasRenderingContext2D,
  samples: Array<{ t: number; energy: number }>,
  rect: { x: number; y: number; w: number; h: number },
  stroke: string,
  fill: string
) {
  // scales
  const t0 = samples[0].t, t1 = samples[samples.length - 1].t;
  const x = (t: number) => rect.x + ((t - t0) / Math.max(1, (t1 - t0))) * rect.w;
  const y = (e: number) => rect.y + rect.h - clamp(0, e, 1) * rect.h;

  // fill
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(rect.x, rect.y + rect.h);
  for (let i = 0; i < samples.length; i++) {
    ctx.lineTo(x(samples[i].t), y(samples[i].energy));
  }
  ctx.lineTo(rect.x + rect.w, rect.y + rect.h);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();

  // line
  ctx.beginPath();
  ctx.lineWidth = 2;
  ctx.strokeStyle = stroke;
  ctx.moveTo(x(samples[0].t), y(samples[0].energy));
  for (let i = 1; i < samples.length; i++) ctx.lineTo(x(samples[i].t), y(samples[i].energy));
  ctx.stroke();
  ctx.restore();
}

function drawStatChips(
  ctx: CanvasRenderingContext2D,
  chips: Array<{ label: string; value: string }>,
  origin: { x: number; y: number },
  palette: Required<PostcardOptions['palette']>
) {
  const padX = 14, padY = 8, gap = 10;
  ctx.save();
  ctx.font = `600 16px ui-sans-serif, system-ui`;
  ctx.textBaseline = 'middle';

  let x = origin.x;
  chips.forEach(ch => {
    const wLabel = ctx.measureText(ch.label).width;
    ctx.font = `700 18px ui-sans-serif, system-ui`;
    const wVal = ctx.measureText(ch.value).width;
    const w = Math.ceil(wLabel + wVal + padX * 3);
    const h = 34;

    roundedRect(ctx, x, origin.y, w, h, 10, palette.chipBg);
    ctx.fillStyle = palette.chipInk;
    ctx.font = `600 14px ui-sans-serif, system-ui`;
    ctx.fillText(ch.label, x + padX, origin.y + h / 2);
    ctx.font = `700 16px ui-sans-serif, system-ui`;
    ctx.fillText(ch.value, x + padX + wLabel + padX * 0.6, origin.y + h / 2);

    x += w + gap;
  });
  ctx.restore();
}

function roundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string) {
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.restore();
}

function fitPathToRect(path: LatLng[], rect: { x: number; y: number; w: number; h: number }) {
  const pts = path.filter(Boolean);
  if (pts.length === 0) return [] as { x: number; y: number }[];

  // bounds
  let minLat = +Infinity, maxLat = -Infinity, minLng = +Infinity, maxLng = -Infinity;
  pts.forEach(p => {
    minLat = Math.min(minLat, p.lat); maxLat = Math.max(maxLat, p.lat);
    minLng = Math.min(minLng, p.lng); maxLng = Math.max(maxLng, p.lng);
  });

  // handle degenerate
  if (minLat === maxLat) { minLat -= 0.0001; maxLat += 0.0001; }
  if (minLng === maxLng) { minLng -= 0.0001; maxLng += 0.0001; }

  const sx = rect.w / (maxLng - minLng);
  const sy = rect.h / (maxLat - minLat);
  const s = Math.min(sx, sy);

  const offX = rect.x + (rect.w - (maxLng - minLng) * s) / 2;
  const offY = rect.y + (rect.h - (maxLat - minLat) * s) / 2;

  // y invert (lat increases north/up but canvas y increases down)
  return pts.map(p => ({
    x: offX + (p.lng - minLng) * s,
    y: offY + (maxLat - p.lat) * s,
  }));
}

function makeChips(s: PostcardStats) {
  const out: Array<{ label: string; value: string }> = [];
  out.push({ label: 'Distance', value: formatKm(s.distanceM) });
  out.push({ label: 'Time', value: formatMin(s.elapsedMin) });
  if (typeof s.suiPct === 'number') out.push({ label: 'SUI', value: `${Math.round(s.suiPct)}%` });
  if (typeof s.venues === 'number') out.push({ label: 'Venues', value: `${s.venues}` });
  return out;
}

const clamp = (lo: number, v: number, hi: number) => Math.max(lo, Math.min(hi, v));
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

function formatKm(m: number) {
  if (!isFinite(m) || m <= 0) return '0 km';
  const km = m / 1000;
  return km >= 10 ? `${km.toFixed(0)} km` : `${km.toFixed(1)} km`;
}
function formatMin(min: number) {
  if (!isFinite(min) || min <= 0) return '0m';
  if (min < 60) return `${Math.round(min)}m`;
  const h = Math.floor(min / 60), m = Math.round(min % 60);
  return m > 0 ? `${h}h ${m}m` : `${h}h`;
}