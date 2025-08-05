import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react';
import mapboxgl from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';

import { MapContainerManager } from '@/lib/map/MapContainerManager';
import { getMapboxToken, clearMapboxTokenCache } from '@/lib/geo/getMapboxToken';
import { setMapInstance }       from '@/lib/geo/project';
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

// Create context for selected floq
const SelectedFloqContext = createContext<{
  selectedFloqId: string | null;
  selectedFloqMembers: string[];
}>({
  selectedFloqId: null,
  selectedFloqMembers: []
});

export const useSelectedFloq = () => useContext(SelectedFloqContext);

// Remove registerMapboxWorker() for Mapbox v3

interface Props {
  onRegionChange: (b:{
    minLat:number; minLng:number; maxLat:number; maxLng:number; zoom:number;
  })=>void;
  children?:React.ReactNode;
  visible?: boolean;
  floqs?: any[]; // Add floqs prop
  realtime?: boolean; // Add realtime status prop
}

export const FieldWebMap: React.FC<Props> = ({ onRegionChange, children, visible, floqs = [], realtime = false }) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const userMarkerRef = useRef<mapboxgl.Marker|null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [selectedVibe, setSelectedVibe] = useState<string>('all');
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
    let filtered = floqs;
    
    // Filter by vibe
    if (selectedVibe !== 'all') {
      filtered = filtered.filter(floq => floq.primary_vibe === selectedVibe);
    }
    
    return filtered;
  }, [floqs, selectedVibe, selectedMyFloq]);

  // Filter people to show only members of selected floq
  const filteredPeople = useMemo(() => {
    if (!selectedMyFloq || !selectedFloqMembers.length) {
      return []; // Return empty array when no floq is selected or no members
    }
    
    // For now, we'll return the selected floq members as people with proper Person interface
    return selectedFloqMembers.map(member => ({
      id: member.profile_id,
      lng: 0, // These would be actual coordinates in a real implementation
      lat: 0,
      x: 0,
      y: 0,
      isFriend: false
    }));
  }, [selectedMyFloq, selectedFloqMembers]);

  // Prepare context value for selected floq
  const selectedFloqContextValue = useMemo(() => ({
    selectedFloqId: selectedMyFloq,
    selectedFloqMembers: selectedFloqMembers.map(member => member.profile_id)
  }), [selectedMyFloq, selectedFloqMembers]);

  const initialCenter: [number, number] = location?.coords ? [location.coords.lng, location.coords.lat] : [-118.4912, 34.0224];

  const [status,setStatus] = useState<'loading'|'ready'|'error'>('loading');
  const [err,setErr]       = useState<string>();
  const [showWeather, setShowWeather] = useState(false);

  // Initialize unified map layers (preserves all existing functionality)
  const { layersReady } = useMapLayers({
    map: mapRef.current,
    people: filteredPeople,
    floqs: filteredFloqs,
    onClusterClick: (clusterId, coordinates) => {
      console.log('Cluster clicked:', clusterId, coordinates);
    }
  });

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

  useEffect(()=>{
    if(!mapContainerRef.current||mapRef.current) return;
    let dead=false;

    // Handle resize events properly
    const handleResize = () => {
      if (mapRef.current && !dead) {
        try {
          mapRef.current.resize();
        } catch (error) {
          console.warn('Map resize error:', error);
        }
      }
    };

    // Add resize listener
    window.addEventListener('resize', handleResize);

    (async ()=>{
      try{
        // CRITICAL: Prepare container to prevent pollution error (sync import)
        const containerManager = MapContainerManager.getInstance();
        
        if (!containerManager.prepareContainer(mapContainerRef.current!)) {
          console.error('[FieldWebMap] Container preparation failed');
          setStatus('error');
          setErr('Map container not ready');
          return;
        }

        // Clear cache to force fresh token retrieval
        clearMapboxTokenCache();
        const{token}=await getMapboxToken();
        mapboxgl.accessToken=token;

        // Get initial center from user location or fallback to Venice Beach
        const initialCenter: [number, number] = location.coords?.lat && location.coords?.lng 
          ? [location.coords.lng, location.coords.lat] 
          : [-118.4695, 33.9850]; // Venice Beach fallback

        // Create map with guaranteed-to-exist style
        let map: mapboxgl.Map;
        
        map = new mapboxgl.Map({
          container: mapContainerRef.current!,
          /* Use a guaranteed-to-exist style.  
             Replace with your own later if you want. */
          style: 'mapbox://styles/mapbox/dark-v11',
          center: initialCenter,
          zoom: 11,
          preserveDrawingBuffer: true,
          antialias: true
        });
        mapRef.current=map;

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
          setStatus('ready');
          
          // 🔧 DEBUG: Verify map is ready for source operations
          console.log('🗺️ Map ready for sources. Style loaded:', map.isStyleLoaded());
          
          // Note: 'people' source is now managed by usePeopleSource hook
          // to prevent race conditions with style loading
        });

        // Add cluster click handler
        map.on('click', 'floq-clusters', (e) => {
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
        
        // Change cursor on cluster hover
        map.on('mouseenter', 'floq-clusters', () => {
          map.getCanvas().style.cursor = 'pointer';
        });
        
        map.on('mouseleave', 'floq-clusters', () => {
          map.getCanvas().style.cursor = '';
        });

        // Add hover effects for individual floq points
        map.on('mouseenter', 'floq-points', () => {
          map.getCanvas().style.cursor = 'pointer';
          // Add hover effect by temporarily changing the layer paint
          map.setPaintProperty('floq-points', 'circle-radius', 16);
          map.setPaintProperty('floq-points', 'circle-opacity', 1);
          map.setPaintProperty('floq-points', 'circle-stroke-width', 3);
        });

        map.on('mouseleave', 'floq-points', () => {
          map.getCanvas().style.cursor = '';
          // Restore original paint properties
          map.setPaintProperty('floq-points', 'circle-radius', 12);
          map.setPaintProperty('floq-points', 'circle-opacity', 0.95);
          map.setPaintProperty('floq-points', 'circle-stroke-width', 2);
        });

        // Add hover effects for clusters
        map.on('mouseenter', 'floq-clusters', () => {
          map.getCanvas().style.cursor = 'pointer';
          // Add hover effect by temporarily changing the layer paint
          map.setPaintProperty('floq-clusters', 'circle-opacity', 1);
          map.setPaintProperty('floq-clusters', 'circle-stroke-width', 4);
          map.setPaintProperty('floq-clusters', 'circle-stroke-opacity', 1);
        });

        map.on('mouseleave', 'floq-clusters', () => {
          map.getCanvas().style.cursor = '';
          // Restore original paint properties
          map.setPaintProperty('floq-clusters', 'circle-opacity', 0.9);
          map.setPaintProperty('floq-clusters', 'circle-stroke-width', 3);
          map.setPaintProperty('floq-clusters', 'circle-stroke-opacity', 1);
        });

        // Add click handler for individual floq points
        map.on('click', 'floq-points', (e) => {
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

        // Show tooltip on cluster hover
        map.on('mouseenter', 'floq-clusters', (e) => {
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

        // Show tooltip on individual floq hover
        map.on('mouseenter', 'floq-points', (e) => {
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

        // Close popups when clicking on the map background
        map.on('click', (e) => {
          const features = map.queryRenderedFeatures(e.point, {
            layers: ['floq-clusters', 'floq-points']
          });
          
          // If we didn't click on a floq or cluster, close any open popups
          if (features.length === 0) {
            popup.remove();
            // Also close any detailed popups
            const popups = document.querySelectorAll('.mapboxgl-popup');
            popups.forEach(p => p.remove());
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
        if(!dead){setErr(e.message);setStatus('error');}
      }
    })();

    return()=>{
      dead=true;
      // Remove resize listener
      window.removeEventListener('resize', handleResize);
      
      if(mapRef.current){
        mapRef.current.remove();
        mapRef.current=null;
        setMapInstance(null);
      }
      if(userMarkerRef.current){
        userMarkerRef.current.remove();
        userMarkerRef.current=null;
      }
    };
  },[onRegionChange, location.coords?.lat, location.coords?.lng]);

  // Helper to safely access map source
  const withUserLocationSource = useCallback((cb: (src: mapboxgl.GeoJSONSource) => void) => {
    if (!mapRef.current) return;
    
    // Wait until style & source are ready
    if (mapRef.current.isStyleLoaded()) {
      const src = mapRef.current.getSource('user-location') as mapboxgl.GeoJSONSource | undefined;
      if (src) return cb(src);
    }
    // Not ready yet – try again on the next style/load event
    mapRef.current.once('styledata', () => withUserLocationSource(cb));
  }, []);

  // Update user location when it changes
  useEffect(() => {
    if (!mapRef.current || !isLocationReady || !location.coords?.lat || !location.coords?.lng) return;
    
    const map = mapRef.current;
    
    withUserLocationSource((source) => {
      // Update user location data
      source.setData({
        type: 'FeatureCollection',
        features: [
          {
            type: 'Feature',
            geometry: {
              type: 'Point',
              coordinates: [location.coords.lng, location.coords.lat]
            },
            properties: {
              accuracy: location.coords?.accuracy || 10
            }
          }
        ]
      });
      
      // Center map on user location if it's the first time
      if (!map.isMoving()) {
        map.flyTo({
          center: [location.coords.lng, location.coords.lat],
          zoom: 14,
          duration: 2000
        });
      }
    });
  }, [location.coords?.lat, location.coords?.lng, location.coords?.accuracy, isLocationReady, withUserLocationSource]);

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
      
      // Clear loading state after data is updated
      setTimeout(() => setIsLoading(false), 300);
    });
  }, [floqsGeoJSON, withFloqsSource]);


  /* render */
  return (
    <SelectedFloqContext.Provider value={selectedFloqContextValue}>
      <div className="absolute inset-0">
        <div ref={mapContainerRef} className="absolute inset-0" />
        
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

        {children}
      </div>
    </SelectedFloqContext.Provider>
  );
};