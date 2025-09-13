import React, { useEffect } from 'react';
import { layerManager } from '@/lib/map/LayerManager';
import { createFlowRouteSpec, flowRouteToFC } from '@/lib/map/overlays/flowRouteSpec';
import { useFlowRoute } from '@/hooks/useFlowRoute';
import { eventBridge, Events } from '@/services/eventBridge';
import type mapboxgl from 'mapbox-gl';

interface FlowRouteMapLayerProps {
  map: mapboxgl.Map | null;
}

export function FlowRouteMapLayer({ map }: FlowRouteMapLayerProps) {
  const { flowRoute, isRetracing } = useFlowRoute();

  // Register layer spec when map is available
  useEffect(() => {
    if (!map) return;
    layerManager.register(createFlowRouteSpec());
    return () => layerManager.unregister('flow-route');
  }, [map]);

  // Show/hide flow route based on retrace state
  useEffect(() => {
    if (isRetracing && flowRoute.length > 0) {
      const featureCollection = flowRouteToFC(flowRoute);
      layerManager.apply('flow-route', featureCollection);
    } else {
      // Hide route when not retracing
      layerManager.apply('flow-route', { type: 'FeatureCollection', features: [] });
    }
  }, [flowRoute, isRetracing]);

  // Listen for breadcrumb events
  useEffect(() => {
    const handleShow = (data: any) => {
      if (data?.path) {
        const features = data.path.map((point: any, index: number) => ({
          type: 'Feature',
          geometry: { type: 'Point', coordinates: point.position },
          properties: {
            type: 'venue',
            id: point.id,
            name: point.venueName,
            index: index
          }
        }));

        // Add trail line if we have multiple points
        if (data.path.length > 1) {
          features.push({
            type: 'Feature',
            geometry: {
              type: 'LineString',
              coordinates: data.path.map((p: any) => p.position)
            },
            properties: {
              type: 'trail',
              mode: data.mode || 'display'
            }
          });
        }

        layerManager.apply('flow-route', {
          type: 'FeatureCollection',
          features
        });
      }
    };

    const handleHide = () => {
      layerManager.apply('flow-route', { type: 'FeatureCollection', features: [] });
    };

    eventBridge.on(Events.FLOQ_BREADCRUMB_SHOW, handleShow);
    eventBridge.on(Events.FLOQ_BREADCRUMB_HIDE, handleHide);

    return () => {
      eventBridge.off(Events.FLOQ_BREADCRUMB_SHOW, handleShow);
      eventBridge.off(Events.FLOQ_BREADCRUMB_HIDE, handleHide);
    };
  }, []);

  return null; // This component only manages map layers
}