import { useEffect, useMemo, useRef } from 'react';
import mapboxgl from 'mapbox-gl';

export interface FriendPoint {
  id: string;
  lat: number;
  lng: number;
  vibe?: string | null;
}

interface UseFriendMiniTrailsOptions {
  highlightFriendId?: string | null;
  maxPointsPerFriend?: number;
  minMetersToAdd?: number;
}

function haversineMeters(a: {lat:number;lng:number}, b:{lat:number;lng:number}) {
  const toRad = (d:number)=>d*Math.PI/180;
  const R = 6371000;
  const dLat = toRad(b.lat - a.lat);
  const dLng = toRad(b.lng - a.lng);
  const s1 = Math.sin(dLat/2), s2 = Math.sin(dLng/2);
  const aa = s1*s1 + Math.cos(toRad(a.lat))*Math.cos(toRad(b.lat))*s2*s2;
  return 2*R*Math.atan2(Math.sqrt(aa), Math.sqrt(1-aa));
}

/**
 * Render short friend trails as a single GeoJSON line source/layer.
 */
export function useFriendMiniTrails(
  map: mapboxgl.Map | null,
  friends: FriendPoint[],
  opts: UseFriendMiniTrailsOptions = {}
) {
  const buffersRef = useRef<Map<string, Array<{lat:number;lng:number;ts:number;vibe?:string|null}>>>(new Map());
  const highlightRef = useRef<string | null>(null);

  const maxPts = opts.maxPointsPerFriend ?? 5;
  const minMeters = opts.minMetersToAdd ?? 15;

  // Track highlight
  useEffect(() => { highlightRef.current = opts.highlightFriendId ?? null; }, [opts.highlightFriendId]);

  // Update buffers on friend position changes
  useEffect(() => {
    if (!friends?.length) return;
    const now = Date.now();
    friends.forEach(fr => {
      if (fr.lat == null || fr.lng == null) return;
      const buf = buffersRef.current.get(fr.id) ?? [];
      const last = buf[buf.length - 1];
      if (!last || haversineMeters(last, fr) >= minMeters) {
        const next = [...buf, { lat: fr.lat, lng: fr.lng, ts: now, vibe: fr.vibe }];
        if (next.length > maxPts) next.shift();
        buffersRef.current.set(fr.id, next);
      }
    });
  }, [friends.map(f => `${f.id}:${f.lat?.toFixed(5)}:${f.lng?.toFixed(5)}`).join('|')]);

  // Build GeoJSON
  const geojson = useMemo(() => {
    const features: GeoJSON.Feature[] = [];
    buffersRef.current.forEach((pts, friendId) => {
      if (pts.length < 2) return;
      const coords = pts.map(p => [p.lng, p.lat]);
      const vibe = pts[pts.length - 1]?.vibe ?? null;
      const highlight = highlightRef.current === friendId;
      features.push({
        type: 'Feature',
        geometry: { type: 'LineString', coordinates: coords as any },
        properties: { friend_id: friendId, vibe, highlight }
      } as GeoJSON.Feature);
    });
    return { type: 'FeatureCollection', features } as const;
  }, [friends.length, opts.highlightFriendId]);

  // Ensure source/layer & update data
  useEffect(() => {
    if (!map) return;

    const ensure = () => {
      if (!map.getSource('friend-trails')) {
        map.addSource('friend-trails', { type: 'geojson', data: { type:'FeatureCollection', features: [] } });
      }
      if (!map.getLayer('friend-trails')) {
        map.addLayer({
          id: 'friend-trails',
          type: 'line',
          source: 'friend-trails',
          layout: { 'line-cap': 'round', 'line-join': 'round' },
          paint: {
            'line-width': [
              'case', ['==', ['get','highlight'], true], 3.5, 2
            ],
            'line-opacity': [
              'case', ['==', ['get','highlight'], true], 0.9, 0.35
            ],
            'line-color': [
              'case',
              ['==',['get','vibe'],'social'], '#059669',
              ['==',['get','vibe'],'hype'], '#DC2626',
              ['==',['get','vibe'],'curious'], '#7C3AED',
              ['==',['get','vibe'],'chill'], '#2563EB',
              ['==',['get','vibe'],'solo'], '#0891B2',
              ['==',['get','vibe'],'romantic'], '#EC4899',
              ['==',['get','vibe'],'weird'], '#F59E0B',
              ['==',['get','vibe'],'down'], '#6B7280',
              ['==',['get','vibe'],'flowing'], '#10B981',
              ['==',['get','vibe'],'open'], '#84CC16',
              '#A3A3A3'
            ]
          }
        });
      }
      const src = map.getSource('friend-trails') as mapboxgl.GeoJSONSource;
      src?.setData(geojson);
    };

    if (map.isStyleLoaded()) ensure();
    else map.once('styledata', ensure);
  }, [map, geojson]);
}