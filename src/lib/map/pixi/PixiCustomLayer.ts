import * as PIXI from 'pixi.js'
import type { PressureCell } from '@/lib/api/mapContracts'
import { brand } from '@/lib/tokens/brand'

// ---- subsystem contract ------------------------------------------------------
export interface AtmoSystem {
  onAdd(stage: PIXI.Container, map: mapboxgl.Map): void
  onFrame(dt: number, project: (lng: number, lat: number) => { x: number; y: number }, zoom: number): void
  onUpdateCells?(cells: PressureCell[], zoom: number): void
  onRemove(): void
}
// -----------------------------------------------------------------------------

type DeviceTier = 'low' | 'mid' | 'high'

function hexToPixi(hex: string): number {
  const s = hex.startsWith('#') ? hex.slice(1) : hex
  return parseInt(s, 16)
}

export type PixiAtmoOptions = {
  id?: string
  deviceTier?: DeviceTier
  maxSprites?: number
  colorHex?: string
  radiusByPressure?: (p: number, zoom: number) => number
}

export interface CustomLayerWithAPI extends mapboxgl.CustomLayerInterface {
  updateCells: (cells: PressureCell[] | undefined, zoom?: number) => void
  attach: (system: AtmoSystem) => void
}

export function createPixiCustomLayer(opts: PixiAtmoOptions = {}): CustomLayerWithAPI {
  const id = opts.id ?? 'pixi-atmo'
  const tier = opts.deviceTier ?? 'mid'
  const color = hexToPixi(opts.colorHex ?? brand.accent)
  const maxSprites = Math.max(16, Math.min(800, opts.maxSprites ?? (tier === 'low' ? 120 : tier === 'mid' ? 220 : 360)))

  const size = opts.radiusByPressure ?? ((p: number, zoom: number) => {
    const base = 2 + p * 8
    const zFactor = Math.min(1.8, Math.max(1, (zoom - 10) * 0.15 + 1))
    return base * zFactor
  })

  let mapRef: mapboxgl.Map | null = null
  let renderer: PIXI.Renderer | null = null
  const stage = new PIXI.Container()

  // simple dot field (base atmo) ------------------------------------------------
  type SpriteRec = { sprite: PIXI.Sprite; lng: number; lat: number; pressure: number; alive: boolean }
  const pool: SpriteRec[] = []
  const live: SpriteRec[] = []
  function ensurePool(target: number) {
    while (pool.length + live.length < target) {
      const s = PIXI.Sprite.from(PIXI.Texture.WHITE)
      s.anchor.set(0.5)
      s.tint = color
      s.alpha = 0.28
      s.visible = false
      stage.addChild(s)
      pool.push({ sprite: s, lng: 0, lat: 0, pressure: 0, alive: false })
    }
  }
  function recycleAll() {
    for (const rec of live) {
      rec.alive = false
      rec.sprite.visible = false
      pool.push(rec)
    }
    live.length = 0
  }
  // -----------------------------------------------------------------------------

  // plugin systems --------------------------------------------------------------
  const systems: AtmoSystem[] = []
  function attach(system: AtmoSystem) {
    systems.push(system)
    if (mapRef) system.onAdd(stage, mapRef)
    if (lastCells.length && system.onUpdateCells) system.onUpdateCells(lastCells, lastZoom)
  }
  // -----------------------------------------------------------------------------

  function project(map: mapboxgl.Map) {
    return (lng: number, lat: number) => {
      const p = map.project([lng, lat])
      return { x: p.x, y: p.y }
    }
  }

  function syncFromCells(map: mapboxgl.Map, cells: PressureCell[], zoom: number) {
    const budget = Math.min(maxSprites, cells.length)
    ensurePool(budget)
    recycleAll()
    const projectXY = project(map)
    for (let i = 0; i < budget; i++) {
      const c = cells[i]
      const rec = pool.pop()!
      rec.lng = c.center[0]; rec.lat = c.center[1]; rec.pressure = c.pressure; rec.alive = true
      const { x, y } = projectXY(rec.lng, rec.lat)
      rec.sprite.position.set(x, y)
      rec.sprite.visible = true
      const r = size(c.pressure, zoom)
      rec.sprite.scale.set(r, r)
      rec.sprite.alpha = 0.18 + 0.22 * c.pressure
      live.push(rec)
    }
    for (const s of systems) s.onUpdateCells?.(cells, zoom)
  }

  function animateBase(dt: number) {
    if (!live.length) return
    const jitter = Math.min(0.15, Math.max(0.05, dt * 0.06))
    for (let i = 0; i < live.length; i++) {
      const sp = live[i].sprite
      sp.position.x += (Math.random() - 0.5) * jitter
      sp.position.y += (Math.random() - 0.5) * jitter
      sp.alpha = Math.min(0.5, Math.max(0.12, sp.alpha + (Math.random() - 0.5) * 0.01))
    }
  }

  let lastCells: PressureCell[] = []
  let lastZoom = 14

  const layer: CustomLayerWithAPI = {
    id,
    type: 'custom',
    renderingMode: '2d',

    onAdd(map: mapboxgl.Map, gl: WebGLRenderingContext) {
      mapRef = map
      renderer = new PIXI.WebGLRenderer()
      stage.sortableChildren = false
      ensurePool(48)
      // let any pre-attached systems mount now
      for (const s of systems) s.onAdd(stage, mapRef)
    },

    render(gl: WebGLRenderingContext, matrix: number[]) {
      if (!renderer || !mapRef) return
      const z = (mapRef as any).getZoom?.() ?? lastZoom
      if (Math.abs(z - lastZoom) >= 0.25 && lastCells.length) {
        syncFromCells(mapRef, lastCells, z)
        lastZoom = z
      }

      const dt = 16
      animateBase(dt)
      const proj = project(mapRef)
      for (const s of systems) s.onFrame(dt, proj, z)

      renderer.render(stage)
    },

    onRemove() {
      try {
        for (const s of systems) s.onRemove()
        stage.destroy({ children: true })
        renderer?.destroy(true)
      } finally {
        systems.length = 0
        mapRef = null
        renderer = null
        pool.length = 0
        live.length = 0
        lastCells = []
      }
    },

    updateCells(cells?: PressureCell[], zoom?: number) {
      lastCells = cells ?? []
      if (!mapRef) { if (zoom != null) lastZoom = zoom; return }
      const z = zoom ?? (mapRef as any).getZoom?.() ?? lastZoom
      lastZoom = z
      syncFromCells(mapRef, lastCells, z)
    },

    attach
  }

  return layer
}