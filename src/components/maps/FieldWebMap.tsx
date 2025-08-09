// Field Map Implementation - Real version
import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

import { MapContainerManager } from '@/lib/map/MapContainerManager';
import { getMapboxToken, clearMapboxTokenCache } from '@/lib/geo/getMapboxToken';
import { setMapInstance } from '@/lib/geo/project';
import { createMapSafely, cleanupMapSingleton } from '@/lib/geo/mapSingleton';
import { attachUserLocationSource, setUserLocation, USER_LOC_SRC, USER_LOC_LAYER } from '@/lib/geo/withUserLocationSource';
import { useFieldLocation } from '@/components/field/contexts/FieldLocationContext';
import { useMyActiveFloqs } from '@/hooks/useMyActiveFloqs';
import { useFloqMembers } from '@/hooks/useFloqMembers';
import { useWeather } from '@/hooks/useWeather';
import { createContext, useContext } from 'react';
import { Bird, Cloud, Sun, CloudRain, Umbrella } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { WeatherOverlay } from '@/components/ui/WeatherOverlay';
import { useMapLayers } from '@/hooks/useMapLayers';
import { useVisibleFriendsOnMap } from '@/hooks/useVisibleFriendsOnMap';
import { TimewarpMapLayer } from '@/components/field/TimewarpMapLayer';
import { DMQuickSheet } from '@/components/DMQuickSheet';
import { FieldHUD } from '@/components/field/FieldHUD';
import '@/lib/debug/locationDebugger';
import '@/lib/debug/mapDiagnostics';
import '@/lib/debug/canvasMonitor';
import '@/lib/debug/friendsDebugger';
import '@/lib/debug/floqPlanDebugger';
import { trackRender } from '@/lib/debug/renderTracker';

// Create context for selected floq
const SelectedFloqContext = createContext<{
  selectedFloqId: string | null;
  selectedFloqMembers: string[];
}>({
  selectedFloqId: null,
  selectedFloqMembers: []
});

export const useSelectedFloq = () => useContext(SelectedFloqContext);

// Mapbox GL v2.15.0 - worker registration not needed, but keep for reference

interface Props {
  onRegionChange: (b:{
    minLat:number; minLng:number; maxLat:number; maxLng:number; zoom:number;
  })=>void;
  children?:React.ReactNode;
  visible?: boolean;
  floqs?: any[]; // Add floqs prop
  realtime?: boolean; // Add realtime status prop
}

const FieldWebMapComponent: React.FC<Props> = ({ onRegionChange, children, visible, floqs = [], realtime = false }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker|null>(null);
  const detachUserLocationSourceRef = useRef<(() => void) | null>(null);
  const firstPosRef = useRef(true); // 🔧 FIX: Track first position for jumpTo vs flyTo
  const debounceRef = useRef<number>(); // Debounce loading state changes
  const [isLoading, setIsLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [selectedVibe, setSelectedVibe] = useState<string>('all');
  const [highlightedFriend, setHighlightedFriend] = useState<string | null>(null);
  const highlightTimerRef = useRef<number>();
  const [selectedMyFloq, setSelectedMyFloq] = useState<string | null>(null);
  const { location, isLocationReady } = useFieldLocation();

  // Get user's active floqs
  const { data: myFloqs = [] } = useMyActiveFloqs();
  
  // Get real weather data  
  const { data: weatherData } = useWeather();
  
  // Get members of selected floq
  const { data: selectedFloqMembers = [] } = useFloqMembers(selectedMyFloq || '');

  // Filter floqs by selected vibe and selected floq
  const filteredFloqs = useMemo(() => {
    // Add mock floqs in dev mode for testing
    const mockFloqs = import.meta.env.DEV 
      ? (typeof window !== 'undefined' && (window as any).getMockFloqs?.() || [])
      : [];
    
    let filtered = [...floqs, ...mockFloqs];
    
    // Filter by vibe
    if (selectedVibe !== 'all') {
      filtered = filtered.filter(floq => floq.primary_vibe === selectedVibe);
    }
    
    console.log('[FieldWebMap] 🎯 Filtered floqs:', filtered.length, 'total');
    return filtered;
  }, [floqs, selectedVibe, selectedMyFloq]);

  // TODO: Add real plans data from usePlansData or similar hook
  const filteredPlans = useMemo(() => {
    // Add mock plans in dev mode for testing
    const mockPlans = import.meta.env.DEV 
      ? (typeof window !== 'undefined' && (window as any).getMockPlans?.() || [])
      : [];
    
    // For now, just return mock data - this will be populated with real data
    console.log('[FieldWebMap] 📋 Filtered plans:', mockPlans.length, 'total');
    return mockPlans;
  }, []);

  // Build people array with current user + visible friends
  const { people: visibleFriends } = useVisibleFriendsOnMap();
  const filteredPeople = useMemo(() => {
    const currentUserPerson = location?.coords ? [{
      id: 'current-user',
      lng: location.coords.lng,
      lat: location.coords.lat,
      x: 0,
      y: 0,
      you: true,
      isFriend: false
    }] : [];

    // Only real friend coordinates from hook (no 0,0 placeholders)
    const friendPeople = (visibleFriends || [])
      .filter(fr => selectedVibe === 'all' || (fr.vibe ?? '') === selectedVibe)
      .map(fr => ({
        id: fr.id,
        lng: fr.lng,
        lat: fr.lat,
        x: 0,
        y: 0,
        you: false,
        isFriend: true,
        vibe: fr.vibe ?? undefined
      }));

    const result = [...currentUserPerson, ...friendPeople];
    if (import.meta.env.DEV) {
      console.log('[FieldWebMap] people for map:', result);
    }
    return result;
  }, [location?.coords, visibleFriends]);

  // Prepare context value for selected floq
  const selectedFloqContextValue = useMemo(() => ({
    selectedFloqId: selectedMyFloq,
    selectedFloqMembers: selectedFloqMembers.map(member => member.profile_id)
  }), [selectedMyFloq, selectedFloqMembers]);

  // Only use user location, no fallback coordinates

  const [status,setStatus] = useState<'loading'|'ready'|'error'>('loading');
  const [err,setErr]       = useState<string>();
  const [showWeather, setShowWeather] = useState(false);

  // Quick sheet state for friend taps
  const [dmOpen, setDmOpen] = useState(false);
  const [dmFriendId, setDmFriendId] = useState<string | null>(null);

  // Initialize unified map layers (preserves all existing functionality)
  const { layersReady } = useMapLayers({
    map: mapRef.current,
    people: filteredPeople,
    floqs: filteredFloqs,
    plans: filteredPlans,
    onClusterClick: (clusterId, coordinates) => {
      console.log('Cluster clicked:', clusterId, coordinates);
    },
    onFriendClick: (friendId) => {
      setHighlightedFriend(friendId);
      setDmFriendId(friendId);
      setDmOpen(true);
      clearTimeout(highlightTimerRef.current!);
      highlightTimerRef.current = window.setTimeout(() => setHighlightedFriend(null), 5000);
    },
    highlightFriendId: highlightedFriend
  });

  // Render mini trails for visible friends
  const friendTrailInputs = filteredPeople.filter(p => p.isFriend).map(p => ({ id: p.id, lat: p.lat, lng: p.lng, vibe: p.vibe }));
  // Lazy import to avoid circular deps
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const { useFriendMiniTrails } = require('@/hooks/useFriendMiniTrails');
    useFriendMiniTrails(mapRef.current, friendTrailInputs, { highlightFriendId: highlightedFriend });
  } catch {}


  // Use real weather data or fallback to mock
  const weather = weatherData ? {
    condition: mapWeatherCondition((weatherData as any)?.condition ?? 'sunny'),
    temperature: (weatherData as any)?.temperatureF ?? 72,
    humidity: (weatherData as any)?.humidity ?? 45,
    windSpeed: (weatherData as any)?.windMph ?? 8,
    precipitation: 0,
    feelsLike: (weatherData as any)?.feelsLikeF ?? 72
  } : {
    condition: 'sunny' as const,
    temperature: 72,
    humidity: 45,
    windSpeed: 8,
    precipitation: 0,
    feelsLike: 74
  };

  // Helper function to map weather conditions to UI expectations
  function mapWeatherCondition(condition: string): 'sunny' | 'cloudy' | 'rainy' | 'stormy' | 'windy' {
    switch (condition) {
      case 'clear': return 'sunny';
      case 'clouds': return 'cloudy';
      case 'rain':
      case 'drizzle': return 'rainy';
      case 'thunderstorm': return 'stormy';
      case 'snow': return 'rainy'; // Treat snow as rainy for UI
      case 'mist':
      case 'fog': return 'cloudy';
      default: return 'sunny';
    }
  }

  // Get weather icon based on condition
  const getWeatherIcon = (condition: string) => {
    switch (condition) {
      case 'sunny':
        return <Sun className="w-5 h-5 animate-pulse" />;
      case 'cloudy':
        return <Cloud className="w-5 h-5" />;
      case 'rainy':
        return <CloudRain className="w-5 h-5 animate-bounce" />;
      case 'stormy':
        return <Umbrella className="w-5 h-5 animate-pulse" />;
      default:
        return <Sun className="w-5 h-5" />;
    }
  };

  // Get unique vibe types from floqs
  const vibeTypes = useMemo(() => {
    const vibes = new Set(floqs.map(floq => floq.primary_vibe).filter(Boolean));
    return Array.from(vibes).sort();
  }, [floqs]);


  // Memoize floqs data to prevent unnecessary updates
  const floqsGeoJSON = useMemo(() => {
    if (!filteredFloqs.length) return { 
      type: 'FeatureCollection' as const, 
      features: [] 
    };
    
    return {
      type: 'FeatureCollection' as const,
      features: filteredFloqs.map(floq => ({
        type: 'Feature' as const,
        properties: {
          id: floq.id,
          title: floq.title,
          vibe: floq.primary_vibe,
          participants: floq.participant_count || 0,
          distance_meters: floq.distance_meters,
          friend_name: floq.friend_name,
          address: floq.address
        },
        geometry: {
          type: 'Point' as const,
          coordinates: [floq.lng || 0, floq.lat || 0]
        }
      }))
    };
  }, [filteredFloqs]);

  // Memoize center on user location function
  const centerOnUserLocation = useCallback(() => {
    if (!mapRef.current || !location.coords?.lat || !location.coords?.lng) return;
    
    mapRef.current.flyTo({
      center: [location.coords.lng, location.coords.lat],
      zoom: 14,
      duration: 1000
    });
  }, [location.coords?.lat, location.coords?.lng]);

  // Handle resize events with debouncing + idle callback for performance
  const resizeRef = useRef<number>();
  const resizeCountRef = useRef(0);

  // Set up resize listener with debouncing + loop detection + performance optimization
  useEffect(() => {
    const onResize = () => {
      if (mapRef.current) {
        resizeCountRef.current++;
        
        // 🔍 DETECT RESIZE LOOPS: Warn if too many resizes in short time
        if (resizeCountRef.current > 10) {
          console.warn('🚨 Resize loop detected! Count:', resizeCountRef.current);
        }
        
        cancelAnimationFrame(resizeRef.current!);
        resizeRef.current = requestAnimationFrame(() => {
          try {
            mapRef.current?.resize();
          } catch (error) {
            console.warn('Map resize error:', error);
          }
        });
      }
    };
    
    // Reset counter every 5 seconds
    const resetCounter = setInterval(() => {
      resizeCountRef.current = 0;
    }, 5000);
    
    window.addEventListener('resize', onResize);
    return () => {
      window.removeEventListener('resize', onResize);
      cancelAnimationFrame(resizeRef.current!);
      clearInterval(resetCounter);
    };
  }, []);

  
  // 🔧 DEBUG: Mount debugging effect  
  useEffect(() => {
    (window as any).__mountPing = true;
    console.log('[FieldWebMap] 🔧 Component mounted/re-rendered');
    console.log('[FieldWebMap] 🔧 Container exists?', !!mapContainerRef.current);
    console.log('[FieldWebMap] 🔧 Map already exists?', !!mapRef.current);
    console.log('[FieldWebMap] 🔧 Props:', { visible, realtime, floqsCount: floqs.length });
  }, []);

  // Debug re-renders (dev only)
  useEffect(() => {
    if (import.meta.env.DEV) {
      trackRender('FieldWebMap', `Props changed - visible: ${visible}, realtime: ${realtime}, floqs: ${floqs.length}`);
    }
  }, [visible, realtime, floqs.length]);

  useEffect(()=>{
    firstPosRef.current = true;          // ← early reset
    // 🔧 CRITICAL: Prevent double-mount flicker in React 18 Strict Mode
    if (mapRef.current) {
      console.log('[FieldWebMap] 🔄 Map already exists, skipping double-mount');
      return;
    }
    
    if(!mapContainerRef.current) return;
    let dead=false;

    (async ()=>{
      try{
        console.log('[FieldWebMap] 🗺️ Starting map initialization...');
        
        // Check container dimensions before initialization
        const containerRect = mapContainerRef.current!.getBoundingClientRect();
        console.log('[FieldWebMap] Container dimensions:', {
          hasContainer: !!mapContainerRef.current,
          hasExistingMap: !!mapRef.current,
          containerInDOM: !!document.querySelector('[data-map-container]'),
          width: containerRect.width,
          height: containerRect.height,
          rect: containerRect
        });

        // Prevent initialization with zero-dimension containers
        if (containerRect.width === 0 || containerRect.height === 0) {
          console.warn('[FieldWebMap] Container has zero dimensions, forcing resize...');
          // Force container height if needed
          mapContainerRef.current!.style.height = '400px';
          mapContainerRef.current!.style.minHeight = '400px';
          
          // Wait a frame for the DOM to update
          await new Promise(resolve => requestAnimationFrame(resolve));
          
          const newRect = mapContainerRef.current!.getBoundingClientRect();
          console.log('[FieldWebMap] After resize:', newRect);
          
          if (newRect.width === 0 || newRect.height === 0) {
            throw new Error('Container still has zero dimensions after resize attempt');
          }
        }

        // CRITICAL: Prepare container to prevent pollution error (sync import)
        const containerManager = MapContainerManager.getInstance();
        
        if (!containerManager.prepareContainer(mapContainerRef.current!)) {
          console.error('[FieldWebMap] Container preparation failed');
          setStatus('error');
          setErr('Map container not ready');
          return;
        }

        // Early-abort when token missing before map init
        // Guard clearMapboxTokenCache with DEV check
        if (import.meta.env.DEV) {
          clearMapboxTokenCache();
        }
        const { token, source } = await getMapboxToken().catch((e) => {
          console.error('[FieldWebMap] Token fetch failed', e);
          setErr('Mapbox token unavailable');     // shows nice error overlay
          setStatus('error');
          throw e;                                // keeps execution path simple
        });
        mapboxgl.accessToken=token;

        // Only create map if we have user location (allow dev fallback)
        const allowMapWithoutLocation = import.meta.env.DEV;
        if (!isLocationReady && !allowMapWithoutLocation) {
          console.warn('[FieldWebMap] No user location available - waiting for permission');
          setStatus('loading');
          setErr('Waiting for location permission...');
          return;
        }
        
        if (!isLocationReady && allowMapWithoutLocation) {
          console.log('[FieldWebMap] 🔧 DEV: Initializing map without location for development');
        }

        // Use actual location or dev fallback
        const initialCenter: [number, number] = isLocationReady 
          ? [location.coords.lng, location.coords.lat]
          : [-122.4194, 37.7749]; // SF fallback for dev

        // Create map with singleton protection to prevent WebGL context leaks
        console.log('[FieldWebMap] Creating map with singleton protection...');
        const map = createMapSafely(mapContainerRef.current!, {
          style: 'mapbox://styles/mapbox/dark-v11',
          center: initialCenter,
          zoom: 11,
          preserveDrawingBuffer: true,
          antialias: true
        });
        mapRef.current = map;

        // ✅ CRITICAL: Ensure user-location source persists through style reloads
        detachUserLocationSourceRef.current = attachUserLocationSource(map);
        
        // Wait for style to fully load before continuing
        if (!map.isStyleLoaded()) {
          await new Promise(resolve => map.once('style.load', resolve));
        }

        // Add user location marker
        const userMarker = new mapboxgl.Marker({
          color: '#3B82F6', // Blue color for user location
          scale: 1.2
        });
        userMarkerRef.current = userMarker;
        
        // Add error handling for map load
        map.on('error', (e) => {
          // Log but do NOT block rendering for minor 4xx tile/style errors
          console.warn('[Mapbox warning]', e.error?.message);
        });

        // Add user location source and layer

        map.on('load', () => {
          if (dead) return;
          
          console.log('🗺️ Map loaded successfully');
          
          // 🔧 CRITICAL: Add layers BEFORE any handlers to prevent flash/rebuild cycle
          try {
            // 🔧 User location source is now handled by attachUserLocationSource helper

            // Add floqs source with clustering
            map.addSource('floqs', {
              type: 'geojson',
              data: { type: 'FeatureCollection', features: [] },
              cluster: true,
              clusterRadius: 80,
              clusterProperties: {
                'social': ['+', ['case', ['==', ['get', 'vibe'], 'social'], 1, 0]],
                'hype': ['+', ['case', ['==', ['get', 'vibe'], 'hype'], 1, 0]],
                'curious': ['+', ['case', ['==', ['get', 'vibe'], 'curious'], 1, 0]],
                'chill': ['+', ['case', ['==', ['get', 'vibe'], 'chill'], 1, 0]],
                'solo': ['+', ['case', ['==', ['get', 'vibe'], 'solo'], 1, 0]],
                'romantic': ['+', ['case', ['==', ['get', 'vibe'], 'romantic'], 1, 0]],
                'weird': ['+', ['case', ['==', ['get', 'vibe'], 'weird'], 1, 0]],
                'down': ['+', ['case', ['==', ['get', 'vibe'], 'down'], 1, 0]],
                'flowing': ['+', ['case', ['==', ['get', 'vibe'], 'flowing'], 1, 0]],
                'open': ['+', ['case', ['==', ['get', 'vibe'], 'open'], 1, 0]]
              }
            });

            // Add ALL layers before ANY handlers
            map.addLayer({
              id: 'floq-clusters',
              type: 'circle',
              source: 'floqs',
              filter: ['has', 'point_count'],
              paint: {
                'circle-color': [
                  'case',
                  ['>', ['get', 'social'], 0], '#059669',
                  ['>', ['get', 'hype'], 0], '#DC2626',
                  ['>', ['get', 'curious'], 0], '#7C3AED',
                  ['>', ['get', 'chill'], 0], '#2563EB',
                  ['>', ['get', 'solo'], 0], '#0891B2',
                  ['>', ['get', 'romantic'], 0], '#EC4899',
                  ['>', ['get', 'weird'], 0], '#F59E0B',
                  ['>', ['get', 'down'], 0], '#6B7280',
                  ['>', ['get', 'flowing'], 0], '#10B981',
                  ['>', ['get', 'open'], 0], '#84CC16',
                  '#4B5563'
                ],
                'circle-radius': ['step', ['get', 'point_count'], 20, 2, 30, 5, 40, 10, 50],
                'circle-opacity': 0.9,
                'circle-stroke-width': 3,
                'circle-stroke-color': '#FFFFFF'
              }
            });

            map.addLayer({
              id: 'floq-cluster-count',
              type: 'symbol',
              source: 'floqs',
              filter: ['has', 'point_count'],
              layout: {
                'text-field': ['get', 'point_count'],
                'text-font': ['DIN Offc Pro Medium', 'Arial Unicode MS Bold'],
                'text-size': 16
              },
              paint: { 'text-color': '#FFFFFF' }
            });

            map.addLayer({
              id: 'floq-points',
              type: 'circle',
              source: 'floqs',
              filter: ['!', ['has', 'point_count']],
              paint: {
                'circle-color': [
                  'case',
                  ['==', ['get', 'vibe'], 'social'], '#059669',
                  ['==', ['get', 'vibe'], 'hype'], '#DC2626',
                  ['==', ['get', 'vibe'], 'curious'], '#7C3AED',
                  ['==', ['get', 'vibe'], 'chill'], '#2563EB',
                  '#4B5563'
                ],
                'circle-radius': 12,
                'circle-opacity': 0.95,
                'circle-stroke-width': 2,
                'circle-stroke-color': '#FFFFFF'
              }
            });

            console.log('🎯 All layers added successfully BEFORE handlers');
          } catch (error) {
            console.error('❌ Layer setup failed:', error);
            return;
          }
          
          setStatus('ready');
          (window as any).__FLOQ_MAP = map;
          setMapInstance(map);
          
          // Now that map is fully ready, set initial user location if available
          if (location.coords?.lat && location.coords?.lng) {
            setUserLocation(
              map,
              location.coords.lat,
              location.coords.lng,
              location.coords.accuracy || 50
            );
          }
          
          console.log('🗺️ Map ready - layers exist, handlers safe to register');
        });

        // Add cluster click handler - GUARDED
        map.on('click', 'floq-clusters', (e) => {
          // Guard: Only query if layer exists
          if (!map.getLayer('floq-clusters')) {
            console.log('[FieldWebMap] 🛡️ Cluster click blocked - layer not ready');
            return;
          }
          
          const features = map.queryRenderedFeatures(e.point, {
            layers: ['floq-clusters']
          });
          const clusterId = features[0].properties?.cluster_id;
          
          // Close the hover tooltip first
          popup.remove();
          
          // Set transition state
          setIsTransitioning(true);
          
          // Safe source access
          if (map.isStyleLoaded()) {
            const source = map.getSource('floqs') as mapboxgl.GeoJSONSource;
            if (source) {
              source.getClusterExpansionZoom(clusterId, (err, zoom) => {
                if (err) return;
            
                map.easeTo({
                  center: (features[0].geometry as any).coordinates,
                  zoom: zoom,
                  duration: 800,
                  easing: (t) => t * (2 - t) // Smooth ease-out
                });
               
                // Clear transition state after animation
                setTimeout(() => setIsTransitioning(false), 800);
              });
            }
          }
        });
        
        // Change cursor on cluster hover - GUARDED
        map.on('mouseenter', 'floq-clusters', () => {
          if (!map.getLayer('floq-clusters')) return;
          map.getCanvas().style.cursor = 'pointer';
        });
        
        map.on('mouseleave', 'floq-clusters', () => {
          if (!map.getLayer('floq-clusters')) return;
          map.getCanvas().style.cursor = '';
        });

        // Add hover effects for individual floq points - GUARDED
        map.on('mouseenter', 'floq-points', () => {
          if (!map.getLayer('floq-points')) return;
          map.getCanvas().style.cursor = 'pointer';
          // Add hover effect by temporarily changing the layer paint
          map.setPaintProperty('floq-points', 'circle-radius', 16);
          map.setPaintProperty('floq-points', 'circle-opacity', 1);
          map.setPaintProperty('floq-points', 'circle-stroke-width', 3);
        });

        map.on('mouseleave', 'floq-points', () => {
          if (!map.getLayer('floq-points')) return;
          map.getCanvas().style.cursor = '';
          // Restore original paint properties
          map.setPaintProperty('floq-points', 'circle-radius', 12);
          map.setPaintProperty('floq-points', 'circle-opacity', 0.95);
          map.setPaintProperty('floq-points', 'circle-stroke-width', 2);
        });

        // Add hover effects for clusters - GUARDED
        map.on('mouseenter', 'floq-clusters', () => {
          if (!map.getLayer('floq-clusters')) return;
          map.getCanvas().style.cursor = 'pointer';
          // Add hover effect by temporarily changing the layer paint
          map.setPaintProperty('floq-clusters', 'circle-opacity', 1);
          map.setPaintProperty('floq-clusters', 'circle-stroke-width', 4);
          map.setPaintProperty('floq-clusters', 'circle-stroke-opacity', 1);
        });

        map.on('mouseleave', 'floq-clusters', () => {
          if (!map.getLayer('floq-clusters')) return;
          map.getCanvas().style.cursor = '';
          // Restore original paint properties
          map.setPaintProperty('floq-clusters', 'circle-opacity', 0.9);
          map.setPaintProperty('floq-clusters', 'circle-stroke-width', 3);
          map.setPaintProperty('floq-clusters', 'circle-stroke-opacity', 1);
        });

        // Add click handler for individual floq points - GUARDED
        map.on('click', 'floq-points', (e) => {
          if (!map.getLayer('floq-points')) return;
          
          const features = map.queryRenderedFeatures(e.point, {
            layers: ['floq-points']
          });
          
          if (features.length > 0) {
            const floq = features[0];
            const coordinates = (floq.geometry as any).coordinates.slice();
            
            // Close the hover tooltip first
            popup.remove();
            
            // Set loading state for floq details
            setIsLoading(true);
            
            // Smooth zoom to the floq
            map.easeTo({
              center: coordinates,
              zoom: Math.max(map.getZoom() + 2, 16), // Zoom in but not too much
              duration: 600,
              easing: (t) => t * (2 - t)
            });
            
            // Show detailed popup
            const detailPopup = new mapboxgl.Popup({
              closeButton: true,
              maxWidth: '350px',
              className: 'floq-detail-popup',
              offset: 10,
              anchor: 'bottom'
            });
            
            const content = `
              <div class="p-4">
                <h3 class="font-bold text-xl mb-3">${floq.properties?.title || 'Floq'}</h3>
                <div class="flex items-center gap-2 mb-3">
                  <span class="inline-block px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-900">
                    ${floq.properties?.vibe || 'unknown'}
                  </span>
                  <span class="text-sm text-gray-600">
                    ${floq.properties?.participants || 0} people
                  </span>
                </div>
                ${floq.properties?.friend_name ? `
                  <div class="text-sm text-gray-600 mb-2">
                    👤 Hosted by ${floq.properties.friend_name}
                  </div>
                ` : ''}
                ${floq.properties?.address ? `
                  <div class="text-sm text-gray-600 mb-2">
                    📍 ${floq.properties.address}
                  </div>
                ` : ''}
                ${floq.properties?.distance_meters ? `
                  <div class="text-sm text-gray-600 mb-3">
                    🚶 ${Math.round(floq.properties.distance_meters)}m away
                  </div>
                ` : ''}
                <div class="flex gap-2">
                  <button class="px-4 py-2 bg-blue-700 text-white rounded-lg text-sm font-medium hover:bg-blue-800 transition-colors">
                    Join Floq
                  </button>
                  <button class="px-4 py-2 border border-gray-400 text-gray-800 rounded-lg text-sm font-medium hover:bg-gray-100 transition-colors">
                    Share
                  </button>
                  <button class="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors">
                    See More Details
                  </button>
                </div>
              </div>
            `;
            
            detailPopup.setLngLat(coordinates).setHTML(content).addTo(map);
            
            // Clear loading state after popup is shown
            setTimeout(() => setIsLoading(false), 100);
          }
        });

        // Create popup for tooltips
        const popup = new mapboxgl.Popup({
          closeButton: false,
          closeOnClick: false,
          maxWidth: '300px',
          offset: 10,
          anchor: 'bottom'
        });

        // Show tooltip on cluster hover - GUARDED
        map.on('mouseenter', 'floq-clusters', (e) => {
          if (!map.getLayer('floq-clusters')) return;
          
          const features = map.queryRenderedFeatures(e.point, {
            layers: ['floq-clusters']
          });
          
          if (features.length > 0) {
            const cluster = features[0];
            const coordinates = (cluster.geometry as any).coordinates.slice();
            
            // Build tooltip content
            const vibeCounts = [];
            if (cluster.properties?.social > 0) vibeCounts.push(`${cluster.properties.social} social`);
            if (cluster.properties?.hype > 0) vibeCounts.push(`${cluster.properties.hype} hype`);
            if (cluster.properties?.curious > 0) vibeCounts.push(`${cluster.properties.curious} curious`);
            if (cluster.properties?.chill > 0) vibeCounts.push(`${cluster.properties.chill} chill`);
            if (cluster.properties?.solo > 0) vibeCounts.push(`${cluster.properties.solo} solo`);
            if (cluster.properties?.romantic > 0) vibeCounts.push(`${cluster.properties.romantic} romantic`);
            if (cluster.properties?.weird > 0) vibeCounts.push(`${cluster.properties.weird} weird`);
            if (cluster.properties?.down > 0) vibeCounts.push(`${cluster.properties.down} down`);
            if (cluster.properties?.flowing > 0) vibeCounts.push(`${cluster.properties.flowing} flowing`);
            if (cluster.properties?.open > 0) vibeCounts.push(`${cluster.properties.open} open`);
            
            const content = `
              <div class="p-3">
                <h3 class="font-semibold text-lg mb-2">${cluster.properties?.point_count} Floqs Nearby</h3>
                <div class="text-sm text-gray-600">
                  ${vibeCounts.join(', ')}
                </div>
                <div class="text-xs text-gray-500 mt-1">
                  Click to zoom in
                </div>
              </div>
            `;
            
            popup.setLngLat(coordinates).setHTML(content).addTo(map);
          }
        });

        map.on('mouseleave', 'floq-clusters', () => {
          popup.remove();
        });

        // Show tooltip on individual floq hover - GUARDED  
        map.on('mouseenter', 'floq-points', (e) => {
          if (!map.getLayer('floq-points')) return;
          
          const features = map.queryRenderedFeatures(e.point, {
            layers: ['floq-points']
          });
          
          if (features.length > 0) {
            const floq = features[0];
            const coordinates = (floq.geometry as any).coordinates.slice();
            
            const content = `
              <div class="p-3">
                <h3 class="font-semibold text-lg mb-1">${floq.properties?.title || 'Floq'}</h3>
                <div class="text-sm text-gray-600 mb-2">
                  <span class="inline-block px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
                    ${floq.properties?.vibe || 'unknown'}
                  </span>
                </div>
                ${floq.properties?.friend_name ? `
                  <div class="text-sm text-gray-600 mb-1">
                   👤 ${floq.properties.friend_name}
                 </div>
               ` : ''}
               ${floq.properties?.address ? `
                 <div class="text-sm text-gray-600 mb-1">
                   📍 ${floq.properties.address}
                 </div>
               ` : ''}
                <div class="text-sm text-gray-600">
                  ${floq.properties?.participants || 0} participants
                </div>
                ${floq.properties?.distance_meters ? `
                  <div class="text-xs text-gray-500 mt-1">
                   🚶 ${Math.round(floq.properties.distance_meters)}m away
                  </div>
                ` : ''}
              </div>
            `;
            
            popup.setLngLat(coordinates).setHTML(content).addTo(map);
          }
        });

        map.on('mouseleave', 'floq-points', () => {
          popup.remove();
        });

        // Close popups when clicking on the map background - GUARDED
        map.on('click', (e) => {
          // Only query if layers exist
          const layers = [];
          if (map.getLayer('floq-clusters')) layers.push('floq-clusters');
          if (map.getLayer('floq-points')) layers.push('floq-points');
          
          if (layers.length > 0) {
            const features = map.queryRenderedFeatures(e.point, { layers });
            
            // If we didn't click on a floq or cluster, close any open popups
            if (features.length === 0) {
              popup.remove();
              // Also close any detailed popups
              const popups = document.querySelectorAll('.mapboxgl-popup');
              popups.forEach(p => p.remove());
            }
          }
        });

        // Add "My Location" button
        const locationButton = document.createElement('button');
        locationButton.className = 'mapboxgl-ctrl-group mapboxgl-ctrl';
        locationButton.innerHTML = `
          <div style="
            width: 30px;
            height: 30px;
            display: flex;
            align-items: center;
            justify-content: center;
            background: #1F2937;
            border: 1px solid #374151;
            border-radius: 4px;
            color: #F9FAFB;
            cursor: pointer;
            transition: all 0.2s;
          ">
            📍
          </div>
        `;
        
        locationButton.addEventListener('click', () => {
          if (location?.coords?.lat && location.coords?.lng) {
            map.flyTo({
              center: [location.coords.lng, location.coords.lat],
              zoom: 15,
              duration: 1000,
              easing: (t) => t * (2 - t)
            });
          }
        });
        
        locationButton.addEventListener('mouseenter', () => {
          locationButton.querySelector('div').style.background = '#374151';
        });
        
        locationButton.addEventListener('mouseleave', () => {
          locationButton.querySelector('div').style.background = '#1F2937';
        });
        
        // Add button to map controls
        const controlsContainer = map.getContainer().querySelector('.mapboxgl-ctrl-top-right');
        if (controlsContainer) {
          controlsContainer.appendChild(locationButton);
        }

        const fire=()=>{
          const b=map.getBounds();
          onRegionChange({
            minLat:b.getSouth(),minLng:b.getWest(),
            maxLat:b.getNorth(),maxLng:b.getEast(),
            zoom:map.getZoom()
          });
        };

        map.once('load',()=>{
          if(dead) return;
          setMapInstance(map);
          fire();
          map.on('moveend',fire);
          setStatus('ready');
        });

        map.on('error',e=>{
          if(dead) return;
          setErr(e.error?.message || 'unknown');
          setStatus('error');
        });
      }catch(e:any){
        console.error('[FieldWebMap] ❌ Mount failed', e);
        console.error('[FieldWebMap] Error details:', {
          message: e.message,
          stack: e.stack?.split('\n').slice(0, 3),
          tokenSet: !!mapboxgl.accessToken,
          containerExists: !!mapContainerRef.current
        });
        setErr(e.message ?? 'Map initialization failed');
        setStatus('error');
      }
    })();

    return () => {
      dead = true;
      if (mapRef.current) {
        console.log('🗺️ Cleaning up map instance');
        
        // FIX: Reset firstPosRef on unmount to prevent stuck state
        firstPosRef.current = true;
        
        // FIX: Cancel pending resize animations
        if (resizeRef.current) {
          cancelAnimationFrame(resizeRef.current);
        }
        
        // FIX: Cleanup user location source listeners
        if (detachUserLocationSourceRef.current) {
          detachUserLocationSourceRef.current();
          detachUserLocationSourceRef.current = null;
        }
        
        try {
          mapRef.current.remove(); // This frees WebGL context
          mapRef.current = null;
          setMapInstance(null);
          console.log('🗺️ ✅ Map cleanup complete');
        } catch (error) {
          console.warn('🗺️ Map cleanup error:', error);
        }
      }
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
        userMarkerRef.current = null;
      }
    };
  },[onRegionChange]);

  // Helper to safely access map source

  // Update user location when it changes - Use safe utility function
  useEffect(() => {
    if (!mapRef.current || !isLocationReady || !location.coords?.lat || !location.coords?.lng) return;
    
    const map = mapRef.current;
    
    // Additional safety check before calling setUserLocation
    if (!map || typeof map.isStyleLoaded !== 'function') {
      console.warn('[FieldWebMap] Map reference invalid in location update effect');
      return;
    }
    
    // ✅ FIX: Ensure user location source is attached first
    const updateLocation = () => {
      // Check if the user location source is ready (attached by attachUserLocationSource)
      const isSourceReady = (map as any).__userLocationSourceReady?.();
      if (!isSourceReady) {
        console.warn('[FieldWebMap] User location source not ready, skipping location update');
        return;
      }
      
      // Use the safe setUserLocation utility
      setUserLocation(
        map,
        location.coords!.lat,
        location.coords!.lng,
        location.coords!.accuracy
      );
      
      // Don't jumpTo if coords are still the SF demo
      const isDemo = location.coords?.lat === 37.7749 && location.coords?.lng === -122.4194;
      if (!isDemo && firstPosRef.current) {
        firstPosRef.current = false;
        console.log('[FieldWebMap] 🔧 First position - using jumpTo for instant positioning');
        map.jumpTo({ 
          center: [location.coords!.lng, location.coords!.lat], 
          zoom: 14 
        });
      } else if (!map.isMoving()) {
        console.log('[FieldWebMap] 🔧 Subsequent position update - using flyTo');
        map.flyTo({
          center: [location.coords!.lng, location.coords!.lat],
          zoom: 14,
          duration: 2000
        });
      } else {
        console.log('[FieldWebMap] 🔧 Map is moving - skipping position update');
      }
    };
    
    // ✅ FIX: Use map.load event for proper timing
    if (map.loaded()) {
      updateLocation();
    } else {
      map.once('load', updateLocation);
    }
  }, [location.coords?.lat, location.coords?.lng, location.coords?.accuracy, isLocationReady]);

  // Helper to safely access floqs source
  const withFloqsSource = useCallback((cb: (src: mapboxgl.GeoJSONSource) => void) => {
    if (!mapRef.current) return;
    
    // Wait until style & source are ready
    if (mapRef.current.isStyleLoaded()) {
      const src = mapRef.current.getSource('floqs') as mapboxgl.GeoJSONSource | undefined;
      if (src) return cb(src);
    }
    // Not ready yet – try again on the next style/load event
    mapRef.current.once('styledata', () => withFloqsSource(cb));
  }, []);

  // Update floqs data when floqs change
  useEffect(() => {
    if (!mapRef.current) return;
    
    // Set loading state for data updates
    setIsLoading(true);
    
    withFloqsSource((source) => {
      // Use memoized GeoJSON data
      source.setData(floqsGeoJSON);
      
      // Debounce: only clear after *no* update for 300ms
      clearTimeout(debounceRef.current);
      debounceRef.current = window.setTimeout(() => setIsLoading(false), 300);
    });
  }, [floqsGeoJSON, withFloqsSource]);


  return (
    <SelectedFloqContext.Provider value={selectedFloqContextValue}>
      <div className="absolute inset-0" style={{ height: '100vh', width: '100%', minHeight: '400px' }}>
        {/* Map container with explicit height to prevent zero-height issues */}
        <div 
          ref={mapContainerRef} 
          data-map-container
          className="absolute inset-0"
          style={{ 
            width: '100%',
            height: '100%',
            minHeight: '400px', // Prevent zero-height containers
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0
          }}
        />
        
        {/* Vibe Filter Dropdown */}
        {status === 'ready' && vibeTypes.length > 0 && (
          <div className="absolute top-16 left-4 z-50 text-white rounded-lg p-2">
            <select
              value={selectedVibe}
              onChange={(e) => setSelectedVibe(e.target.value)}
              className="bg-black/70 text-white text-sm border border-gray-600 rounded px-2 py-1 focus:outline-none focus:border-blue-400 cursor-pointer hover:border-gray-500 transition-colors"
            >
              <option value="all" className="bg-gray-800 text-white">
                All Vibes ({floqs.length})
              </option>
              {vibeTypes.map(vibe => (
                <option key={vibe} value={vibe} className="bg-gray-800 text-white">
                  {vibe.charAt(0).toUpperCase() + vibe.slice(1)} ({floqs.filter(f => f.primary_vibe === vibe).length})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* My Floqs Bird Icon Button */}
        {status === 'ready' && myFloqs.length > 0 && (
          <div className="absolute top-16 right-4 z-50">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className={`w-12 h-12 rounded-full border transition-all duration-200 flex items-center justify-center shadow-lg hover:scale-105 ${
                  selectedMyFloq 
                    ? 'bg-blue-600/90 border-blue-400 text-white' 
                    : 'bg-black/70 hover:bg-black/80 border-gray-600 hover:border-blue-400 text-white'
                }`}>
                  <Bird className="w-5 h-5" />
                </button>
              </DropdownMenuTrigger>
              
              <DropdownMenuContent 
                className="w-56 bg-black/90 border border-gray-600 text-white"
                side="bottom"
                align="end"
              >
                <div className="px-2 py-1.5 text-xs text-gray-400 border-b border-gray-600">
                  My Floqs ({myFloqs.length})
                </div>
                
                <DropdownMenuItem 
                  className="text-white hover:bg-gray-800 focus:bg-gray-800"
                  onSelect={() => setSelectedMyFloq(null)}
                >
                  <span className="text-sm">Show All People</span>
                </DropdownMenuItem>
                
                <DropdownMenuSeparator className="bg-gray-600" />
                
                {myFloqs.map(floq => (
                  <DropdownMenuItem 
                    key={floq.id}
                    className={`text-white hover:bg-gray-800 focus:bg-gray-800 ${
                      selectedMyFloq === floq.id ? 'bg-blue-600/20' : ''
                    }`}
                    onSelect={() => setSelectedMyFloq(floq.id)}
                  >
                    <div className="flex flex-col items-start">
                      <span className="text-sm font-medium">
                        {floq.title || floq.name}
                      </span>
                      <span className="text-xs text-gray-400">
                        {floq.member_count || 0} members
                      </span>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}

        {/* Selected Floq Status */}
        {status === 'ready' && selectedMyFloq && (
          <div className="absolute top-24 left-4 z-50 bg-blue-600/90 text-white rounded-lg px-3 py-2 text-xs shadow-lg">
            <div className="flex items-center gap-2">
              <span>Showing members of: {myFloqs.find(f => f.id === selectedMyFloq)?.title || 'Selected Floq'}</span>
              <button
                onClick={() => setSelectedMyFloq(null)}
                className="text-white/80 hover:text-white transition-colors"
                title="Clear filter"
              >
                ✕
              </button>
            </div>
          </div>
        )}

        {/* Weather Icon Button */}
        {status === 'ready' && (
          <button
            onClick={() => setShowWeather(!showWeather)}
            className={`absolute bottom-56 right-4 z-50 rounded-full p-2 shadow-lg transition-colors ${
              showWeather 
                ? 'bg-blue-500 text-white hover:bg-blue-600' 
                : 'bg-white/90 hover:bg-white text-gray-800'
            }`}
            title={`${weather.temperature}°F - ${weather.condition}`}
          >
            <div className="flex flex-col items-center">
              {getWeatherIcon(weather.condition)}
              <span className="text-xs font-medium mt-1">{weather.temperature}°</span>
            </div>
          </button>
        )}

        {/* My Location Button */}
        {status === 'ready' && isLocationReady && (
          <button
            onClick={centerOnUserLocation}
            className="absolute bottom-48 right-4 z-50 bg-white/90 hover:bg-white text-gray-800 rounded-full p-2 shadow-lg transition-colors"
            title="Center on my location"
          >
            <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
            </svg>
          </button>
        )}

        {/* Weather Overlay */}
        {status === 'ready' && showWeather && (
          <WeatherOverlay weather={weather} />
        )}

        {/* Venice Beach Location Indicator */}
        {status === 'ready' && (
          <div className="absolute bottom-48 left-4 z-50 bg-black/30 text-white rounded-lg px-3 py-2 text-xs shadow-lg">
            <div className="flex items-center gap-2">
              <svg className="w-4 h-4 text-purple-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M5.05 4.05a7 7 0 119.9 9.9L10 18.9l-4.95-4.95a7 7 0 010-9.9zM10 11a2 2 0 100-4 2 2 0 000 4z" clipRule="evenodd" />
              </svg>
              <div>
                <div className="font-medium">Venice Canal Historic District</div>
                <div className="text-green-400 font-semibold">LIVE</div>
              </div>
            </div>
          </div>
        )}

        {/* Real-time Update Indicator */}
        {status === 'ready' && (
          <div className="absolute bottom-4 left-4 z-50 bg-black/70 text-white rounded-lg px-2 py-1 text-xs opacity-70 hover:opacity-100 transition-opacity">
            <div className="flex items-center gap-2">
              {realtime ? (
                <>
                  <span className="h-2 w-2 bg-green-400 rounded-full animate-pulse"></span>
                  <span>Real-time</span>
                </>
              ) : (
                <>
                  <span className="h-2 w-2 bg-gray-400 rounded-full"></span>
                  <span>Cached</span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Location Debug Info */}
        {import.meta.env.DEV && isLocationReady && location.coords?.lat && location.coords?.lng && (
          <div className="absolute bottom-4 left-4 z-10 bg-black/70 text-white px-3 py-2 rounded text-xs font-mono">
            <div>Lat: {location.coords.lat.toFixed(6)}</div>
            <div>Lng: {location.coords.lng.toFixed(6)}</div>
            <div>Accuracy: {location.coords.accuracy?.toFixed(0)}m</div>
          </div>
        )}

        {status==='loading'&&(
          <div className="absolute inset-0 grid place-items-center bg-background/80 z-50">
            <span className="h-8 w-8 animate-spin rounded-full border-b-2 border-primary"/>
          </div>
        )}

        {/* Loading indicator for data fetching */}
        {isLoading && status === 'ready' && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 bg-black/70 text-white px-4 py-2 rounded-full text-sm">
            <div className="flex items-center gap-2">
              <span className="h-4 w-4 animate-spin rounded-full border-b-2 border-white"></span>
              Loading floqs...
            </div>
          </div>
        )}

        {/* Transition indicator for cluster expansion */}
        {isTransitioning && status === 'ready' && (
          <div className="absolute top-4 left-1/2 transform -translate-x-1/2 z-20 bg-black/70 text-white px-4 py-2 rounded-full text-sm">
            <div className="flex items-center gap-2">
              <span className="h-4 w-4 animate-pulse">🔍</span>
              Expanding cluster...
            </div>
          </div>
        )}

        {status==='error'&&(
          <div className="absolute inset-0 grid place-items-center bg-background/80 z-50">
            <div className="text-center">
              <p className="text-sm text-destructive mb-1">Map error</p>
              {err&&<p className="text-xs text-muted-foreground">{err}</p>}
            </div>
          </div>
        )}

        {/* Timewarp Map Layer */}
        <TimewarpMapLayer map={mapRef.current} />

        {/* HUD overlays */}
        <FieldHUD
          onOpenFilters={() => {
            try {
              // Lazy access without import cycle
              const { useFloqUI } = require('@/contexts/FloqUIContext');
              const ui = useFloqUI?.();
              ui?.setShowFiltersModal?.(true);
            } catch {
              // Fallback: toggle a local state or no-op
            }
          }}
          onCenterMap={centerOnUserLocation}
          onToggleWeather={() => setShowWeather(v => !v)}
          activeVibe={selectedVibe}
          onSelectVibe={setSelectedVibe}
        />

        {/* DM Quick Sheet for friend taps */}
        <DMQuickSheet open={dmOpen} onOpenChange={setDmOpen} friendId={dmFriendId} />

        {children}
      </div>
    </SelectedFloqContext.Provider>
  );
};

// Memoize the component to prevent unnecessary re-renders
export const FieldWebMap = React.memo(FieldWebMapComponent, (prevProps, nextProps) => {
  // Custom comparison to prevent re-renders from reference changes
  return (
    prevProps.visible === nextProps.visible &&
    prevProps.realtime === nextProps.realtime &&
    prevProps.floqs.length === nextProps.floqs.length &&
    prevProps.onRegionChange === nextProps.onRegionChange // This should now be stable
  );
});