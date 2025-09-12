/* eslint-disable @typescript-eslint/no-explicit-any */
import type mapboxgl from 'mapbox-gl';

export type OverlaySpec = {
  /** unique, stable id for the overlay */
  id: string;
  /** optional target to place this layer before (keeps order stable) */
  beforeId?: string;
  /** add sources/layers once (style-safe; LayerManager calls this after style.load) */
  mount: (map: mapboxgl.Map) => void;
  /** update data only (never create sources/layers here) */
  update: (map: mapboxgl.Map, data: any) => void;
  /** remove layers/sources added by mount */
  unmount: (map: mapboxgl.Map) => void;
};

type Mounted = {
  spec: OverlaySpec;
  mounted: boolean;
  prevHash?: string;
  setDataCount: number;
};

const hashJSON = (v: any) => {
  try { return JSON.stringify(v); } catch { return String(Math.random()); }
};

class LayerManager {
  private map: mapboxgl.Map | null = null;
  private overlays = new Map<string, Mounted>();
  private order: string[] = [];
  private pending = new Map<string, any>();
  private raf = 0;
  private lowPower = false;

  bindMap(map: mapboxgl.Map) {
    if (this.map === map) return;
    this.unbind();
    this.map = map;
    const onStyle = () => this.remountAll();
    map.on('style.load', onStyle);
    (map as any)._lm_onStyle = onStyle;
    if (map.isStyleLoaded?.()) this.remountAll();
  }

  unbind() {
    if (!this.map) return;
    try {
      const onStyle = (this.map as any)._lm_onStyle;
      if (onStyle) this.map.off('style.load', onStyle);
    } catch {}
    this.unmountAll();
    this.map = null;
  }

  setOrder(ids: string[]) { this.order = ids.slice(); }

  setLowPower(on: boolean) { this.lowPower = on; }

  register(spec: OverlaySpec) {
    if (this.overlays.has(spec.id)) return;
    this.overlays.set(spec.id, { spec, mounted: false, setDataCount: 0 });
    // Keep order deterministic
    if (!this.order.includes(spec.id)) this.order.push(spec.id);
    this.tryMount(spec.id);
  }

  remove(id: string) {
    const ent = this.overlays.get(id);
    if (!ent || !this.map) { this.overlays.delete(id); return; }
    this.safe(() => ent.mounted && ent.spec.unmount(this.map!));
    this.overlays.delete(id);
    this.pending.delete(id);
  }

  apply(id: string, data: any) {
    if (!this.overlays.has(id)) return;
    this.pending.set(id, data);
    if (!this.raf) this.raf = requestAnimationFrame(() => this.flush());
  }

  getStats() {
    const out: Record<string, number> = {};
    this.overlays.forEach((o, id) => out[id] = o.setDataCount);
    return out;
  }

  // ——— internals ———
  private remountAll() {
    if (!this.map) return;
    // mount in declared order
    this.order.forEach(id => this.tryMount(id));
    // flush any pending data
    if (this.pending.size) this.flush();
  }

  private tryMount(id: string) {
    if (!this.map) return;
    const ent = this.overlays.get(id); if (!ent || ent.mounted) return;
    if (!this.map.isStyleLoaded?.()) return;
    this.safe(() => ent.spec.mount(this.map!));
    ent.mounted = true;
  }

  private flush() {
    this.raf = 0;
    if (!this.map || !this.map.isStyleLoaded?.()) return;
    const batch = this.lowPower ? [...this.pending.entries()].slice(0, 1) : [...this.pending.entries()];
    this.pending.clear();
    for (const [id, data] of batch) {
      const ent = this.overlays.get(id); if (!ent) continue;
      if (!ent.mounted) this.tryMount(id);
      if (!ent.mounted) continue;
      const h = hashJSON(data);
      if (h === ent.prevHash) continue;
      ent.prevHash = h;
      this.safe(() => { ent.spec.update(this.map!, data); ent.setDataCount++; });
    }
  }

  private unmountAll() {
    if (!this.map) return;
    [...this.overlays.values()].forEach(ent => {
      this.safe(() => ent.mounted && ent.spec.unmount(this.map!));
      ent.mounted = false;
    });
  }

  private safe(fn: () => void) {
    try { fn(); } catch (e) { console.warn('[LayerManager]', e); }
  }
}

export const layerManager = new LayerManager();
