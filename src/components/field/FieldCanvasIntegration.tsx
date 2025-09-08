import React, { useEffect, useRef } from 'react';
import * as PIXI from 'pixi.js';
import { useEnhancedFieldTiles } from '@/hooks/useEnhancedFieldTiles';
import { useConvergencePredictions } from '@/hooks/useConvergencePredictions';
import { EnhancedParticleTrailSystem } from '@/lib/field/EnhancedParticleTrailSystem';
import type { EnhancedFieldTile } from '../../../packages/types/domain/enhanced-field';

interface FieldCanvasIntegrationProps {
  pixiApp: PIXI.Application;
  viewportBounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  };
  onTileUpdate?: (tiles: EnhancedFieldTile[]) => void;
  onConvergencePrediction?: (predictions: any[]) => void;
}

/**
 * Integration component for enhanced field tiles with existing FieldCanvas
 * Manages the enhanced particle trail system and convergence predictions
 */
export function FieldCanvasIntegration({
  pixiApp,
  viewportBounds,
  onTileUpdate,
  onConvergencePrediction
}: FieldCanvasIntegrationProps) {
  const trailSystemRef = useRef<EnhancedParticleTrailSystem | null>(null);

  // Get enhanced field tiles with physics
  const { 
    tiles: enhancedTiles, 
    aggregateMetrics,
    getTileTrails 
  } = useEnhancedFieldTiles({
    bounds: viewportBounds,
    enablePhysics: true,
    updateInterval: 2000
  });

  // Get convergence predictions
  const { 
    predictions,
    getHighConfidencePredictions,
    getImminentPredictions 
  } = useConvergencePredictions(enhancedTiles as EnhancedFieldTile[]);

  // Initialize trail system
  useEffect(() => {
    if (!pixiApp || trailSystemRef.current) return;

    trailSystemRef.current = new EnhancedParticleTrailSystem(pixiApp.stage);

    return () => {
      if (trailSystemRef.current) {
        trailSystemRef.current.destroy();
        trailSystemRef.current = null;
      }
    };
  }, [pixiApp]);

  // Update trails when tiles change
  useEffect(() => {
    if (!trailSystemRef.current || !enhancedTiles.length) return;

    // Convert tile positions to screen coordinates
    const screenCoords = new Map<string, { x: number; y: number }>();
    
    enhancedTiles.forEach(tile => {
      if (tile.history && tile.history.length > 0) {
        const latLng = tile.history[0].centroid;
        // You would need to convert lat/lng to screen coordinates here
        // This is just a placeholder - integrate with your existing projection logic
        const screenPos = { x: 0, y: 0 }; // projectToScreen(latLng.lat, latLng.lng);
        screenCoords.set(tile.tile_id, screenPos);
      }
    });

    // Update trail system (cast to handle type differences)
    trailSystemRef.current.updateTrails(enhancedTiles as EnhancedFieldTile[], screenCoords);
  }, [enhancedTiles]);

  // Notify parent components of updates
  useEffect(() => {
    if (onTileUpdate && enhancedTiles.length > 0) {
      onTileUpdate(enhancedTiles as EnhancedFieldTile[]);
    }
  }, [enhancedTiles, onTileUpdate]);

  useEffect(() => {
    if (onConvergencePrediction && predictions.length > 0) {
      onConvergencePrediction(predictions);
    }
  }, [predictions, onConvergencePrediction]);

  // Render convergence predictions as visual indicators
  useEffect(() => {
    const highConfidencePredictions = getHighConfidencePredictions(0.8);
    const imminentPredictions = getImminentPredictions();

    // You could render these predictions as visual overlays on the canvas
    // For example, draw lines between converging tiles or highlight meeting points
    
    console.log('High confidence predictions:', highConfidencePredictions);
    console.log('Imminent predictions:', imminentPredictions);
  }, [predictions, getHighConfidencePredictions, getImminentPredictions]);

  // Performance monitoring
  useEffect(() => {
    if (!trailSystemRef.current) return;

    const logStats = () => {
      const stats = trailSystemRef.current?.getStats();
      if (stats && import.meta.env.DEV) {
        console.log('Enhanced Trail System Stats:', stats);
      }
    };

    const interval = setInterval(logStats, 10000); // Every 10 seconds
    return () => clearInterval(interval);
  }, []);

  return null; // This is a logic-only component
}

/**
 * Hook for integrating enhanced field tiles into existing components
 */
export function useEnhancedFieldIntegration(
  viewportBounds: {
    minLat: number;
    maxLat: number;
    minLng: number;
    maxLng: number;
  }
) {
  const { 
    tiles, 
    aggregateMetrics,
    getTileTrails,
    getTileHistory 
  } = useEnhancedFieldTiles({
    bounds: viewportBounds,
    enablePhysics: true
  });

  const { 
    predictions,
    getHighConfidencePredictions,
    getImminentPredictions 
  } = useConvergencePredictions(tiles as EnhancedFieldTile[]);

  return {
    // Enhanced tiles data
    enhancedTiles: tiles,
    aggregateMetrics,
    
    // Trail data for rendering
    trailData: getTileTrails(),
    
    // Convergence predictions
    convergencePredictions: predictions,
    highConfidencePredictions: getHighConfidencePredictions(),
    imminentPredictions: getImminentPredictions(),
    
    // Utility functions
    getTileHistory,
    
    // Statistics
    stats: {
      totalTiles: tiles.length,
      activeTiles: tiles.filter(t => t.afterglow_intensity && t.afterglow_intensity > 0.1).length,
      movingTiles: tiles.filter(t => t.velocity && t.velocity.magnitude > 0.5).length,
      convergingTiles: tiles.filter(t => t.convergence_vector).length,
      ...aggregateMetrics
    }
  };
}