export async function captureOverlaysToPNG(opts: {
  width?: number; height?: number; caption?: string; branding?: string;
  canvases?: HTMLCanvasElement[]; background?: string; mapCanvas?: HTMLCanvasElement;
}): Promise<Blob> {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  const parent = document.body
  const w = opts.width  ?? (parent.clientWidth || 1080)
  const h = opts.height ?? (parent.clientHeight || 1920)

  const off = document.createElement('canvas')
  off.width = Math.round(w * dpr)
  off.height = Math.round(h * dpr)
  const ctx = off.getContext('2d')!
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)

  // background (dark radial if not provided)
  if (opts.background) {
    ctx.fillStyle = opts.background
    ctx.fillRect(0,0,w,h)
  } else {
    const g = ctx.createRadialGradient(w*0.5, h*0.35, 120, w*0.5, h*0.35, h*0.9)
    g.addColorStop(0, 'rgba(15,17,35,0.95)')
    g.addColorStop(1, 'rgba(5,6,15,1)')
    ctx.fillStyle = g; ctx.fillRect(0,0,w,h)
  }

  // draw overlay canvases (map first if provided)
  const list = opts.canvases ?? Array.from(document.querySelectorAll('canvas'))
    .filter(c => (c as any).dataset?.share !== 'off') as HTMLCanvasElement[]
  const canvases = opts.mapCanvas ? [opts.mapCanvas, ...list] : list

  for (const c of canvases) {
    // scale to viewport (assumes they match screen size; otherwise fit)
    ctx.drawImage(c, 0, 0, w, h)
  }

  // caption (glass card at golden ratio)
  if (opts.caption) {
    const x = w * 0.62, y = h * 0.38
    ctx.save()
    ctx.fillStyle = 'rgba(255,255,255,0.08)'
    ctx.strokeStyle = 'rgba(255,255,255,0.25)'
    ctx.lineWidth = 1
    const pad = 14, tw = Math.min(360, w*0.32), th = 68
    roundedRect(ctx, x, y, tw, th, 12); ctx.fill(); ctx.stroke()

    ctx.fillStyle = '#ffffff'
    ctx.font = '600 16px system-ui, -apple-system, Segoe UI, Roboto'
    wrapText(ctx, opts.caption, x + pad, y + pad + 16, tw - pad*2, 20)
    ctx.restore()
  }

  // branding
  if (opts.branding) {
    ctx.fillStyle = 'rgba(255,255,255,0.35)'
    ctx.font = '700 14px system-ui, -apple-system, Segoe UI, Roboto'
    ctx.textAlign = 'right'
    ctx.fillText(opts.branding, w - 14, h - 14)
  }

  return new Promise(res => off.toBlob(b => res(b!), 'image/png', 0.92))
}

function roundedRect(ctx: CanvasRenderingContext2D, x:number,y:number,w:number,h:number,r:number){
  ctx.beginPath()
  ctx.moveTo(x+r, y); ctx.lineTo(x+w-r,y); ctx.quadraticCurveTo(x+w,y,x+w,y+r)
  ctx.lineTo(x+w,y+h-r); ctx.quadraticCurveTo(x+w,y+h,x+w-r,y+h)
  ctx.lineTo(x+r,y+h); ctx.quadraticCurveTo(x,y+h,x,y+h-r)
  ctx.lineTo(x,y+r); ctx.quadraticCurveTo(x,y,x+r,y); ctx.closePath()
}

function wrapText(ctx: CanvasRenderingContext2D, txt:string, x:number,y:number,maxW:number,lineH:number){
  const words = txt.split(/\s+/); let line = ''; let yy = y
  for (const w of words){
    const test = line ? line + ' ' + w : w
    const m = ctx.measureText(test)
    if (m.width > maxW){ ctx.fillText(line, x, yy); line = w; yy += lineH }
    else line = test
  }
  if (line) ctx.fillText(line, x, yy)
}