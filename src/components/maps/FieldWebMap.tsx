// Field Map Implementation - Real version
import React, { useEffect, useRef, useState, useMemo, useCallback, memo } from 'react';
import { Map as MapboxMap } from 'mapbox-gl';
import 'mapbox-gl/dist/mapbox-gl.css';
import { Deck } from '@deck.gl/core';
import { ScatterplotLayer, TextLayer } from '@deck.gl/layers';
import { HexagonLayer } from '@deck.gl/aggregation-layers';
import { MapView } from '@deck.gl/core';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { useGeo } from '@/hooks/useGeo';
import { MapboxAccessToken } from '@/lib/mapbox';
import { useMapboxStyle } from '@/hooks/useMapboxStyle';
import { useFieldTiles } from '@/hooks/useFieldTiles';
import { usePresenceDemoData } from '@/hooks/usePresenceDemoData';
import { useFieldPeople } from '@/hooks/useFieldPeople';
import { useFilteredPeople } from '@/hooks/useFilteredPeople';
import { useMapViewport } from '@/hooks/useMapViewport';
import { useMapInteractions } from '@/hooks/useMapInteractions';
import { useVibeFilter } from '@/hooks/useVibeFilter';
import { convertPresenceToMapboxFeature } from '@/lib/map/presenceToMapbox';

// Development-only debug imports
if (import.meta.env.DEV) {
  import('@/lib/debug/locationDebugger');
  import('@/lib/debug/mapDiagnostics');
  import('@/lib/debug/canvasMonitor');
  import('@/lib/debug/friendsDebugger');
  import('@/lib/debug/floqPlanDebugger');
  import('@/lib/debug/renderTracker').then(({ trackRender }) => {
    // Track render performance in development
    trackRender('FieldWebMap');
  });
}

interface FieldWebMapProps {
  className?: string;
  onMapLoad?: (map: MapboxMap) => void;
  selectedPersonId?: string;
  onPersonSelect?: (personId: string | null) => void;
}

const FieldWebMap: React.FC<FieldWebMapProps> = memo(({
  className = '',
  onMapLoad,
  selectedPersonId,
  onPersonSelect
}) => {
  const { user } = useAuth();
  const { location } = useGeo();
  const mapRef = useRef<MapboxMap | null>(null);
  const deckRef = useRef<Deck | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  
  const { mapboxStyle } = useMapboxStyle();
  const { viewport, setViewport } = useMapViewport(location);
  
  // Data hooks
  const { data: fieldTiles } = useFieldTiles(viewport);
  const { data: fieldPeople } = useFieldPeople();
  const { vibeFilter } = useVibeFilter();
  const { filteredPeople } = useFilteredPeople(fieldPeople || [], vibeFilter);
  
  // Demo data for development
  const { data: demoData } = usePresenceDemoData();
  
  // Plans data - placeholder for now
  const plansData = useMemo(() => [], []);

  // Map interactions
  const { handleMapClick, handlePersonClick } = useMapInteractions({
    onPersonSelect,
    selectedPersonId
  });

  // Log context state for debugging
  if (import.meta.env.DEV) {
    console.log('FieldWebMap context:', {
      userLocation: location,
      peopleCount: filteredPeople?.length || 0,
      viewport,
      vibeFilter
    });
  }

  // Memoized layers for performance
  const layers = useMemo(() => {
    const mapLayers = [];

    // People presence layer
    if (filteredPeople?.length > 0) {
      const peopleFeatures = filteredPeople.map(person => 
        convertPresenceToMapboxFeature(person)
      );
      
      mapLayers.push(
        new ScatterplotLayer({
          id: 'people-presence',
          data: peopleFeatures,
          pickable: true,
          opacity: 0.8,
          stroked: true,
          filled: true,
          radiusScale: 6,
          radiusMinPixels: 8,
          radiusMaxPixels: 100,
          lineWidthMinPixels: 1,
          getPosition: (d: any) => [d.geometry.coordinates[0], d.geometry.coordinates[1]],
          getRadius: () => 50,
          getFillColor: (d: any) => {
            const isSelected = d.properties.id === selectedPersonId;
            return isSelected ? [255, 165, 0, 200] : [100, 149, 237, 160];
          },
          getLineColor: [255, 255, 255, 255],
          onClick: (info: any) => {
            if (info.object) {
              handlePersonClick(info.object.properties.id);
            }
          }
        })
      );

      // Labels for people
      mapLayers.push(
        new TextLayer({
          id: 'people-labels',
          data: peopleFeatures,
          pickable: false,
          getPosition: (d: any) => [d.geometry.coordinates[0], d.geometry.coordinates[1]],
          getText: (d: any) => d.properties.display_name || 'User',
          getSize: 12,
          getAngle: 0,
          getTextAnchor: 'middle',
          getAlignmentBaseline: 'center',
          getColor: [255, 255, 255, 255],
          fontFamily: 'system-ui, -apple-system, sans-serif',
          fontWeight: 'bold',
        })
      );
    }

    // Hexagon aggregation layer for density
    if (fieldTiles?.length > 0) {
      mapLayers.push(
        new HexagonLayer({
          id: 'presence-density',
          data: fieldTiles,
          pickable: true,
          extruded: false,
          radius: 100,
          elevationScale: 4,
          getPosition: (d: any) => [d.lng, d.lat],
          getFillColor: [255, 140, 0, 120],
          getLineColor: [255, 255, 255, 80]
        })
      );
    }

    return mapLayers;
  }, [filteredPeople, fieldTiles, selectedPersonId, handlePersonClick]);

  // Initialize map
  useEffect(() => {
    if (!containerRef.current || mapRef.current) return;

    const map = new MapboxMap({
      container: containerRef.current,
      style: mapboxStyle,
      center: [viewport.longitude, viewport.latitude],
      zoom: viewport.zoom,
      accessToken: MapboxAccessToken,
      antialias: true,
      optimizeForTerrain: true,
    });

    mapRef.current = map;

    map.on('load', () => {
      // Initialize Deck.gl overlay
      const deck = new Deck({
        canvas: 'deck-canvas',
        width: '100%',
        height: '100%',
        initialViewState: viewport,
        controller: true,
        layers: layers,
        views: [new MapView({ id: 'map' })],
        onViewStateChange: ({ viewState }) => {
          setViewport(viewState);
          map.jumpTo({
            center: [viewState.longitude, viewState.latitude],
            zoom: viewState.zoom,
            bearing: viewState.bearing,
            pitch: viewState.pitch
          });
        },
        onClick: handleMapClick
      });

      deckRef.current = deck;
      onMapLoad?.(map);
    });

    return () => {
      if (deckRef.current) {
        deckRef.current.finalize();
        deckRef.current = null;
      }
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, [mapboxStyle, viewport, layers, onMapLoad, setViewport, handleMapClick]);

  // Update layers when data changes
  useEffect(() => {
    if (deckRef.current) {
      deckRef.current.setProps({ layers });
    }
  }, [layers]);

  return (
    <div className={`relative w-full h-full ${className}`}>
      <div
        ref={containerRef}
        className="absolute inset-0"
        style={{ minHeight: '400px' }}
      />
      <canvas
        id="deck-canvas"
        className="absolute inset-0 pointer-events-none"
        style={{ zIndex: 1 }}
      />
    </div>
  );
});

FieldWebMap.displayName = 'FieldWebMap';

export default FieldWebMap;