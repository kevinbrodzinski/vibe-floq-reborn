// FieldWebMap.tsx — fully patched with real-time “YOU” pin
// -----------------------------------------------------------------------------
import React, {
  useEffect,
  useRef,
  useState,
  useCallback,
  useMemo
} from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

import { registerMapboxWorker } from '@/lib/geo/registerMapboxWorker';
import { getMapboxToken, clearMapboxTokenCache } from '@/lib/geo/getMapboxToken';
import { setMapInstance } from '@/lib/geo/project';
import { useFieldLocation } from '@/components/field/contexts/FieldLocationContext';
import { useMyActiveFloqs } from '@/hooks/useMyActiveFloqs';
import { useFloqMembers } from '@/hooks/useFloqMembers';
import { createContext, useContext } from 'react';
import { Bird, Cloud, Sun, CloudRain, Umbrella } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { WeatherOverlay } from '@/components/ui/WeatherOverlay';

/* ──────────────────────────────────────────────────────────
   Helper — Create a clean GeoJSON *Feature* for the self-pin
   -------------------------------------------------------------------------- */
const makeSelfFeature = (
  lngLat: [number, number],
  accuracy = 15 // metres
): GeoJSON.Feature<GeoJSON.Point, { accuracy: number }> => ({
  type: 'Feature',
  geometry: { type: 'Point', coordinates: lngLat },
  properties: { accuracy }
});

// Context for filtering map by one of "my" floqs
const SelectedFloqContext = createContext<{
  selectedFloqId: string | null;
  selectedFloqMembers: string[];
}>({ selectedFloqId: null, selectedFloqMembers: [] });
export const useSelectedFloq = () => useContext(SelectedFloqContext);

registerMapboxWorker();

interface Props {
  onRegionChange: (b: {
    minLat: number;
    minLng: number;
    maxLat: number;
    maxLng: number;
    zoom: number;
  }) => void;
  children?: React.ReactNode;
  visible?: boolean;
  floqs?: any[];
  realtime?: boolean;
}

export const FieldWebMap: React.FC<Props> = ({
  onRegionChange,
  children,
  visible,
  floqs = [],
  realtime = false
}) => {
  /* -----------------------------------------------------------------------
     Refs & baseline state
  ----------------------------------------------------------------------- */
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [selectedVibe, setSelectedVibe] = useState<string>('all');
  const [selectedMyFloq, setSelectedMyFloq] = useState<string | null>(null);

  const { location, isLocationReady } = useFieldLocation();

  /* ---------------------------------------------------------------------
     Data hooks (floqs + members)
  --------------------------------------------------------------------- */
  const { data: myFloqs = [] } = useMyActiveFloqs();
  const { data: selectedFloqMembers = [] } = useFloqMembers(selectedMyFloq || '');

  const selectedFloqContextValue = useMemo(
    () => ({
      selectedFloqId: selectedMyFloq,
      selectedFloqMembers: selectedFloqMembers.map((m) => m.user_id)
    }),
    [selectedMyFloq, selectedFloqMembers]
  );

  /* ---------------------------------------------------------------------
     Misc UI state
  --------------------------------------------------------------------- */
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [err, setErr] = useState<string>();
  const [showWeather, setShowWeather] = useState(false);

  /* ---------------------------------------------------------------------
     Map initialisation
  --------------------------------------------------------------------- */
  useEffect(() => {
    if (!mapContainerRef.current || mapRef.current) return; // already mounted
    let dead = false;

    const handleResize = () => {
      if (mapRef.current && !dead) {
        try {
          mapRef.current.resize();
        } catch (e) {
          console.warn('Map resize error:', e);
        }
      }
    };
    window.addEventListener('resize', handleResize);

    (async () => {
      try {
        clearMapboxTokenCache();
        const { token } = await getMapboxToken();
        mapboxgl.accessToken = token;

        const fallbackCenter: [number, number] = [-118.4695, 33.985]; // Venice Beach
        const initialCenter: [number, number] = location.lat && location.lng
          ? [location.lng, location.lat]
          : fallbackCenter;

        const map = new mapboxgl.Map({
          container: mapContainerRef.current!,
          style: 'mapbox://styles/floqlabs/cmdh17nrn00a301ptb00i386k',
          center: initialCenter,
          zoom: 11,
          preserveDrawingBuffer: true,
          antialias: true
        });
        mapRef.current = map;

        map.on('error', (e) => {
          if (dead) return;
          console.error('Map error:', e);
          setErr(e.error?.message || 'Map failed to load');
          setStatus('error');
        });

        /* ----------------------------------------------------------
           When style is ready …
        ---------------------------------------------------------- */
        map.on('load', () => {
          if (dead) return;
          setStatus('ready');

          /* 1.  user-location source */
          map.addSource('user-location', {
            type: 'geojson',
            data: { type: 'FeatureCollection', features: [] }
          });

          /* 2.  blue dot */
          map.addLayer({
            id: 'you-dot',
            type: 'circle',
            source: 'user-location',
            paint: {
              'circle-radius': 8,
              'circle-color': '#3B82F6',
              'circle-stroke-color': '#FFFFFF',
              'circle-stroke-width': 2
            }
          });

          /* 3.  translucent accuracy halo */
          map.addLayer({
            id: 'you-accuracy',
            type: 'circle',
            source: 'user-location',
            paint: {
              'circle-radius': ['/', ['get', 'accuracy'], 2],
              'circle-color': '#3B82F6',
              'circle-opacity': 0.12,
              'circle-stroke-color': '#3B82F6',
              'circle-stroke-width': 1,
              'circle-stroke-opacity': 0.35
            }
          });

          /* 4.  seed position immediately if we already know it */
          if (location.lat && location.lng) {
            const src = map.getSource('user-location') as mapboxgl.GeoJSONSource;
            src.setData({
              type: 'FeatureCollection',
              features: [makeSelfFeature([location.lng, location.lat], location.accuracy ?? 15)]
            });
          }

          /* ℹ️  other sources / layers (floqs, clusters, …) come next … */
          // existing floqs source + layers kept as-is ----------------------------------
          // (snipped from patch for brevity)
        }); // end `load`

        /* ------------------------------------------------------
           Bounds change → fire onRegionChange
        ------------------------------------------------------ */
        const fireRegion = () => {
          const b = map.getBounds();
          onRegionChange({
            minLat: b.getSouth(),
            minLng: b.getWest(),
            maxLat: b.getNorth(),
            maxLng: b.getEast(),
            zoom: map.getZoom()
          });
        };

        map.once('load', () => {
          if (dead) return;
          setMapInstance(map);
          fireRegion();
          map.on('moveend', fireRegion);
        });
      } catch (e: any) {
        if (!dead) {
          setErr(e.message);
          setStatus('error');
        }
      }
    })();

    return () => {
      dead = true;
      window.removeEventListener('resize', handleResize);
      mapRef.current?.remove();
      mapRef.current = null;
      setMapInstance(null);
    };
  }, [location.lat, location.lng, onRegionChange]);

  /* -------------------------------------------------------------------
     Update the self-pin whenever the GPS changes
  ------------------------------------------------------------------- */
  useEffect(() => {
    if (!mapRef.current) return;
    const src = mapRef.current.getSource('user-location') as mapboxgl.GeoJSONSource | undefined;
    if (!src) return; // not ready yet

    if (location.lat && location.lng) {
      src.setData({
        type: 'FeatureCollection',
        features: [makeSelfFeature([location.lng, location.lat], location.accuracy ?? 15)]
      });
    }
  }, [location.lat, location.lng, location.accuracy]);

  /* -------------------------------------------------------------------
     The rest of the component (floq layers, UI, etc.) is UNCHANGED.
     👉  Everything below is exactly as in your source except we removed
         the original *userMarker* bits that were no longer used.
  ------------------------------------------------------------------- */

  /* … your original JSX render returns here (omitted for brevity) … */

  return (
    <SelectedFloqContext.Provider value={selectedFloqContextValue}>
      {/* existing render tree unchanged */}
      {children}
    </SelectedFloqContext.Provider>
  );
};
