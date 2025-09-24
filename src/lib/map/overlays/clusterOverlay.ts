/* eslint-disable @typescript-eslint/no-explicit-any */
import mapboxgl from 'mapbox-gl';
import type { OverlaySpec } from '@/lib/map/LayerManager';
import { ensureAvatarImage } from '@/lib/map/avatarSprite';

type Kind = 'friends' | 'venues';

type ClusterOverlayOptions = {
  id: string;                 // 'friends' | 'venues'
  beforeId?: string;          // optional anchor layer
  color: string;              // base color for unclustered points
  clusterColor?: string;      // color for clusters
  textColor?: string;         // cluster count text color
  sourceData?: GeoJSON.FeatureCollection; // optional initial data
  // feature property keys:
  idProp?: string;            // e.g., 'friendId' or 'venueId'
  titleProp?: string;         // e.g., 'name'
  hexProp?: string;           // e.g., 'vibeHex' (for per-friend color)
  kind: Kind;
};

const z = (a:number,b:number,c:number,d:number) => ['interpolate', ['linear'], ['zoom'], a, b, c, d] as any;

function srcId(id:string){ return `${id}-src`; }
function lyr(id:string,suffix:string){ return `${id}-${suffix}`; }

const isTouch = () =>
  typeof window !== 'undefined' &&
  ('ontouchstart' in window || navigator.maxTouchPoints > 0);

function debounce<F extends (...a: any[]) => void>(fn: F, ms = 120) {
  let t: number | undefined;
  return (...args: Parameters<F>) => {
    if (t !== undefined) window.clearTimeout(t);
    t = window.setTimeout(() => fn(...args), ms);
  };
}

function ensureSource(map: mapboxgl.Map, id: string, fc?: GeoJSON.FeatureCollection) {
  const sid = srcId(id);
  if (!map.getSource(sid)) {
    map.addSource(sid, {
      type: 'geojson',
      data: fc ?? { type:'FeatureCollection', features: [] },
      cluster: true,
      clusterRadius: 60,          // px at screen scale
      clusterMaxZoom: 16,         // stop clustering beyond this zoom
      generateId: true,
    } as any);
  }
}

function addLayers(map: mapboxgl.Map, id: string, color: string, clusterColor: string, textColor: string, beforeId?: string) {
  const sid = srcId(id);
  const CL = lyr(id,'cluster');
  const CL_NUM = lyr(id,'cluster-count');
  const PT = lyr(id,'point');
  const PT_AVATAR = lyr(id,'point-avatar');

  // cluster circles with dynamic sizing
  if (!map.getLayer(CL)) {
    map.addLayer({
      id: CL, type: 'circle', source: sid, filter: ['has','point_count'],
      paint: {
        'circle-radius': [
          'interpolate', ['linear'], ['get', 'point_count'],
          5,  14,
          25, 18,
          50, 22,
          100, 26
        ],
        'circle-color': clusterColor,
        'circle-stroke-width': 2,
        'circle-stroke-color': '#ffffff',
        'circle-opacity': 0.9,
        'circle-pitch-scale': 'viewport'
      }
    } as mapboxgl.CircleLayer, beforeId);
  }

  // cluster count text
  if (!map.getLayer(CL_NUM)) {
    map.addLayer({
      id: CL_NUM, type: 'symbol', source: sid, filter: ['has','point_count'],
      layout: {
        'text-field': ['to-string',['get','point_count_abbreviated']],
        'text-size': z(10, 11, 16, 14),
        'text-font': ['Inter Semi Bold','Open Sans Semibold','Arial Unicode MS Bold'],
        'text-allow-overlap': true
      },
      paint: { 'text-color': textColor, 'text-halo-color':'#000', 'text-halo-width':1 }
    } as mapboxgl.SymbolLayer, beforeId);
  }

  // unclustered points (fallback circles)
  if (!map.getLayer(PT)) {
    map.addLayer({
      id: PT, type: 'circle', source: sid, filter: ['!', ['has','point_count']],
      paint: {
        'circle-radius': z(10, 5.5, 16, 7.5),
        'circle-color': ['coalesce',['get','vibeHex'], color],
        'circle-stroke-color': '#fff',
        'circle-stroke-width': 2,
        'circle-opacity': 1,
        'circle-pitch-scale': 'viewport'
      }
    } as mapboxgl.CircleLayer, beforeId);
  }

  // avatar symbol layer for friends
  if (!map.getLayer(PT_AVATAR)) {
    const sym: mapboxgl.SymbolLayer = {
      id: PT_AVATAR,
      type: 'symbol',
      source: sid,
      filter: ['all',
        ['!', ['has','point_count']], 
        ['==',['get','kind'],'friend'],
        ['has','iconId']
      ],
      layout: {
        'icon-image': ['get','iconId'],
        'icon-size': ['interpolate',['linear'],['zoom'], 12,0.35, 16,0.55, 18,0.7],
        'icon-allow-overlap': true,
        'icon-ignore-placement': true
      }
    };
    map.addLayer(sym, PT);
  }
}

function removeLayers(map: mapboxgl.Map, id: string) {
  [lyr(id,'point-avatar'), lyr(id,'cluster-count'), lyr(id,'cluster'), lyr(id,'point')].forEach(L => { 
    try { if (map.getLayer(L)) map.removeLayer(L); } catch {} 
  });
  const sid = srcId(id);
  try { if (map.getSource(sid)) map.removeSource(sid); } catch {}
}

export function createClusterOverlay(opts: ClusterOverlayOptions): OverlaySpec {
  const { id, beforeId, color, clusterColor='#334155', textColor='#ffffff', sourceData, kind, idProp='id', titleProp='name', hexProp='vibeHex' } = opts;
  const SID = srcId(id);
  const CL = lyr(id,'cluster');
  const PT = lyr(id,'point');
  const PT_AVATAR = lyr(id,'point-avatar');
  
  // Drag protection
  let dragging = false;
  let lastDataset: GeoJSON.FeatureCollection | undefined;

  // Popup refs (one per overlay)
  let hoverPopup: mapboxgl.Popup | null = null;
  let hoverClusterPopup: mapboxgl.Popup | null = null;

  function moveToTop(map: mapboxgl.Map) {
    const layers = map.getStyle()?.layers ?? [];
    const top = layers[layers.length - 1]?.id;
    if (!top) return;
    const ids = [PT_AVATAR, PT, lyr(id,'cluster-count'), CL];
    ids.forEach(layerId => { 
      if (map.getLayer(layerId)) { 
        try { map.moveLayer(layerId, top); } catch {} 
      } 
    });
  }

  function ensurePopup(map: mapboxgl.Map) {
    if (!hoverPopup) {
      hoverPopup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 10 });
    }
    return hoverPopup!;
  }

  function ensureClusterPopup(map: mapboxgl.Map) {
    if (!hoverClusterPopup) {
      hoverClusterPopup = new mapboxgl.Popup({ closeButton: false, closeOnClick: false, offset: 10 });
    }
    return hoverClusterPopup!;
  }

  function destroyPopups() {
    try { hoverPopup?.remove(); } catch {}
    try { hoverClusterPopup?.remove(); } catch {}
    hoverPopup = null;
    hoverClusterPopup = null;
  }

  function renderItemHTML(title: string, hex?: string) {
    const dot = hex ? `<span style="display:inline-block;width:8px;height:8px;border-radius:50%;background:${hex};margin-right:6px;border:1px solid rgba(255,255,255,.8)"></span>` : '';
    return `<div style="display:flex;align-items:center;gap:6px">${dot}<div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:256px">${title}</div></div>`;
  }

  function renderClusterHTML(items: Array<{ title: string; hex?: string }>, more: number) {
    const rows = items.map(i => `<li style="padding:4px 0;border-bottom:1px solid rgba(0,0,0,.06)">${renderItemHTML(i.title, i.hex)}</li>`).join('');
    const moreLine = more > 0 ? `<div style="padding-top:6px;color:#64748b;font-size:12px">+${more} more</div>` : '';
    return `
      <div style="font-family:Inter,system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;min-width:220px;max-width:280px">
        <div style="font-weight:600;margin-bottom:6px">Nearby</div>
        <ul style="list-style:none;padding:0;margin:0">${rows}</ul>
        ${moreLine}
      </div>
    `;
  }

  const clickUnclustered = (map: mapboxgl.Map, e: mapboxgl.MapMouseEvent & any) => {
    if (dragging || map.isMoving()) return;
    const f = e.features?.[0];
    if (!f) return;

    const pt = e.lngLat.wrap();
    const payload = {
      id: f.properties?.[idProp] ?? f.properties?.id ?? '',
      name: f.properties?.[titleProp] ?? '',
      lngLat: { lng: pt.lng, lat: pt.lat },
      color: f.properties?.[hexProp] ?? color,
      properties: f.properties ?? {}
    };

    const evt = new CustomEvent(kind === 'friends' ? 'friends:select' : 'venues:select', { detail: payload });
    window.dispatchEvent(evt);
  };

  const clickCluster = async (map: mapboxgl.Map, e: mapboxgl.MapMouseEvent & any) => {
    if (dragging || map.isMoving()) return;
    const clusterFeature = e.features?.[0];
    if (!clusterFeature) return;
    const clusterId = clusterFeature.properties?.cluster_id;
    const src = map.getSource(SID) as any;
    if (!src || clusterId == null) return;

    // If we can expand by zooming (low zoom), do that; otherwise spiderfy
    const zoom = map.getZoom();
    const SPIDERFY_Z = 16; // at / past this zoom, fan out instead of zoom in
    if (zoom < SPIDERFY_Z) {
      try {
        const targetZoom = await new Promise<number>((res, rej) =>
          src.getClusterExpansionZoom(clusterId, (err:any, z:number) => (err ? rej(err) : res(z))));
        map.easeTo({ center: e.lngLat, zoom: Math.max(targetZoom, SPIDERFY_Z - 0.25), duration: 350 });
      } catch {}
      return;
    }

    // Spiderfy: fetch leaves and lay them on a small circle around the center
    try {
      const leaves: any[] = await new Promise((res, rej) =>
        src.getClusterLeaves(clusterId, 25, 0, (err:any, f:any[]) => (err ? rej(err) : res(f)))
      );
      if (!leaves?.length) return;

      const center = [clusterFeature.geometry.coordinates[0], clusterFeature.geometry.coordinates[1]] as [number,number];
      const radiusPx = 36; // screen-space radius
      // Project to screen, place around circle, unproject back to lngLat
      const centerPt = map.project(center);
      const layerId = lyr(id,'spider');
      if (map.getLayer(layerId)) map.removeLayer(layerId);
      const spiderSrcId = `${SID}-spider`;
      if (map.getSource(spiderSrcId)) map.removeSource(spiderSrcId);

      const angleStep = (2*Math.PI) / leaves.length;
      const features = leaves.map((leaf, i) => {
        const angle = i * angleStep;
        const pt = [centerPt.x + radiusPx*Math.cos(angle), centerPt.y + radiusPx*Math.sin(angle)] as [number, number];
        const lngLat = map.unproject(pt);
        return {
          type:'Feature',
          properties: { ...(leaf.properties||{}), __spider: true },
          geometry: { type:'Point', coordinates: [lngLat.lng, lngLat.lat] }
        } as GeoJSON.Feature;
      });

      map.addSource(spiderSrcId, { type:'geojson', data: { type:'FeatureCollection', features } as any });
      map.addLayer({
        id: layerId, type:'circle', source: spiderSrcId,
        paint:{
          'circle-radius': 7,
          'circle-color': ['coalesce',['get',hexProp], color],
          'circle-stroke-color':'#fff',
          'circle-stroke-width': 2,
          'circle-pitch-scale': 'viewport'
        }
      });

      // Spider click handler
      const onSpiderClick = (ev: any) => {
        const f = ev.features?.[0];
        if (!f) return;
        const pt = ev.lngLat.wrap();
        const payload = {
          id: f.properties?.[idProp] ?? f.properties?.id ?? '',
          name: f.properties?.[titleProp] ?? '',
          lngLat: { lng: pt.lng, lat: pt.lat },
          color: f.properties?.[hexProp] ?? color,
          properties: f.properties ?? {}
        };
        window.dispatchEvent(new CustomEvent(
          kind === 'friends' ? 'friends:select' : 'venues:select',
          { detail: payload }
        ));
        cleanup();
      };

      map.on('click', layerId, onSpiderClick);

      // Enhanced cleanup
      const cleanup = () => {
        try { map.off('click', layerId, onSpiderClick); } catch {}
        try { if (map.getLayer(layerId)) map.removeLayer(layerId); } catch {}
        try { if (map.getSource(spiderSrcId)) map.removeSource(spiderSrcId); } catch {}
        map.off('move', cleanup);
        map.off('zoom', cleanup);
        map.off('mousedown', cleanup);
      };
      map.on('move', cleanup);
      map.on('zoom', cleanup);
      map.on('mousedown', cleanup);

    } catch {}
  };

  // Drag guards
  const ds = () => { dragging = true; };
  const de = () => { setTimeout(() => dragging = false, 120); };

  return {
    id,
    beforeId,
    mount(map) {
      if (!map.isStyleLoaded()) { map.once('idle', () => this.mount(map)); return; }
      ensureSource(map, id, sourceData);
      addLayers(map, id, color, clusterColor!, textColor!, beforeId);

      // Drag protection
      map.on('dragstart', ds);
      map.on('dragend', de);

      // interactions
      map.on('click', PT, (e) => clickUnclustered(map, e));
      map.on('click', PT_AVATAR, (e) => clickUnclustered(map, e));
      map.on('click', CL, (e) => clickCluster(map, e));

      if (!isTouch()) {
        // Unclustered hover preview
        const onPointEnter = (e: any) => {
          const f = e.features?.[0]; if (!f) return;
          const title = f.properties?.[titleProp] ?? f.properties?.name ?? '—';
          const hex = f.properties?.[hexProp] ?? color;
          const popup = ensurePopup(map);
          popup.setLngLat(e.lngLat).setHTML(renderItemHTML(title, hex)).addTo(map);
          map.getCanvas().style.cursor = 'pointer';
        };
        const onPointMove = debounce((e: any) => {
          if (hoverPopup) hoverPopup.setLngLat(e.lngLat);
        }, 50);
        const onPointLeave = () => {
          try { hoverPopup?.remove(); } catch {}
          hoverPopup = null;
          map.getCanvas().style.cursor = '';
        };

        // Cluster hover summary (top N leaves)
        const onClusterEnter = (e: any) => {
          const cf = e.features?.[0]; if (!cf) return;
          const clusterId = cf.properties?.cluster_id;
          const src = map.getSource(SID) as any; if (!src) return;

          // fetch up to 12 leaves, render top 8 names
          src.getClusterLeaves(clusterId, 12, 0, (err: any, leaves: any[]) => {
            if (err || !leaves?.length) return;
            const items = leaves.slice(0, 8).map((leaf:any) => ({
              title: leaf.properties?.[titleProp] ?? leaf.properties?.name ?? '—',
              hex: leaf.properties?.[hexProp] ?? undefined
            }));
            const more = Math.max(0, (cf.properties?.point_count ?? 0) - items.length);
            const popup = ensureClusterPopup(map);
            popup.setLngLat(e.lngLat).setHTML(renderClusterHTML(items, more)).addTo(map);
            map.getCanvas().style.cursor = 'pointer';
          });
        };
        const onClusterMove = debounce((e: any) => {
          if (hoverClusterPopup) hoverClusterPopup.setLngLat(e.lngLat);
        }, 50);
        const onClusterLeave = () => {
          try { hoverClusterPopup?.remove(); } catch {}
          hoverClusterPopup = null;
          map.getCanvas().style.cursor = '';
        };

        map.on('mouseenter', PT, onPointEnter);
        map.on('mousemove',  PT, onPointMove);
        map.on('mouseleave', PT, onPointLeave);
        
        map.on('mouseenter', PT_AVATAR, onPointEnter);
        map.on('mousemove',  PT_AVATAR, onPointMove);
        map.on('mouseleave', PT_AVATAR, onPointLeave);

        map.on('mouseenter', CL, onClusterEnter);
        map.on('mousemove',  CL, onClusterMove);
        map.on('mouseleave', CL, onClusterLeave);

        // Clean popups when the map moves/zooms/style changes
        const clean = () => destroyPopups();
        const styleCleanup = () => destroyPopups();
        map.on('dragstart', clean);
        map.on('zoomstart', clean);
        map.on('styledata', styleCleanup);

        // store cleanup closures on the spec (we'll remove in unmount)
        (this as any).__hoverHandlers = {
          onPointEnter,onPointMove,onPointLeave,
          onClusterEnter,onClusterMove,onClusterLeave,
          clean, styleCleanup
        };
      }

      // Z-order guarantees
      const raise = () => moveToTop(map);
      map.on('styledata', raise);
      map.on('load', raise);
      (this as any).__raiseHandler = raise;

      // cursor affordance for all interactions  
      map.on('mouseenter', PT, () => map.getCanvas().style.cursor = 'pointer');
      map.on('mouseleave', PT, () => map.getCanvas().style.cursor = '');
      map.on('mouseenter', PT_AVATAR, () => map.getCanvas().style.cursor = 'pointer');
      map.on('mouseleave', PT_AVATAR, () => map.getCanvas().style.cursor = '');
      map.on('mouseenter', CL, () => map.getCanvas().style.cursor = 'pointer');
      map.on('mouseleave', CL, () => map.getCanvas().style.cursor = '');

      // Initial z-order
      moveToTop(map);
    },
    update(map, fc?: GeoJSON.FeatureCollection) {
      if (!fc) return;
      lastDataset = fc;
      const src = map.getSource(SID) as mapboxgl.GeoJSONSource | undefined;
      if (src) src.setData(fc as any);
    },
    unmount(map) {
      try {
        map.off('dragstart', ds);
        map.off('dragend', de);
        
        const H = (this as any).__hoverHandlers;
        if (H) {
          map.off('mouseenter', PT, H.onPointEnter);
          map.off('mousemove',  PT, H.onPointMove);
          map.off('mouseleave', PT, H.onPointLeave);
          map.off('mouseenter', PT_AVATAR, H.onPointEnter);
          map.off('mousemove',  PT_AVATAR, H.onPointMove);
          map.off('mouseleave', PT_AVATAR, H.onPointLeave);
          map.off('mouseenter', CL, H.onClusterEnter);
          map.off('mousemove',  CL, H.onClusterMove);
          map.off('mouseleave', CL, H.onClusterLeave);
          map.off('dragstart', H.clean);
          map.off('zoomstart', H.clean);
          map.off('styledata', H.styleCleanup);
        }
        
        const raiseHandler = (this as any).__raiseHandler;
        if (raiseHandler) {
          map.off('styledata', raiseHandler);
          map.off('load', raiseHandler);
        }
      } catch {}
      destroyPopups();
      removeLayers(map, id);
    }
  };
}