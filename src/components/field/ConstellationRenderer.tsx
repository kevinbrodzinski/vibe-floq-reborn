import React, { useRef, useEffect, useMemo, useState } from 'react';
import { Graphics, Container, Application } from 'pixi.js';
import { projectLatLng, getMapInstance } from '@/lib/geo/project';
import { geohashToCenter } from '@/lib/geo';
import { throttle } from 'lodash-es';
import type { Person } from '@/components/field/contexts/FieldSocialContext';
import type { FieldTile } from '@/types/field';

// Cached projection interface for performance
interface CachedProjection {
  id: string;
  screenX: number;
  screenY: number;
  data: Person | FieldTile;
}

interface ConstellationRendererProps {
  people: Person[];
  fieldTiles: FieldTile[];
  app: Application | null;
  container: Container | null;
}

export const ConstellationRenderer: React.FC<ConstellationRendererProps> = ({
  people,
  fieldTiles,
  app,
  container
}) => {
  const constellationGraphicsRef = useRef<Graphics | null>(null);
  const friendConnectionsRef = useRef<Graphics | null>(null);
  const [mapRev, setMapRev] = useState(0);
  
  // Subscribe to map movement and zoom events
  useEffect(() => {
    const map = getMapInstance();
    if (!map) return;

    // Throttled handler - fire at most every 33 ms (30 fps)
    const handle = throttle(() => setMapRev(r => r + 1), 33);

    map.on('move', handle);
    map.on('zoom', handle);

    return () => {
      map.off('move', handle);
      map.off('zoom', handle);
      handle.cancel(); // cleanup lodash-es/throttle
    };
  }, []);
  
  
  // Cache projected coordinates to avoid redundant projections
  const cachedProjections = useMemo(() => {
    const cache: CachedProjection[] = [];
    
    // Cache friend projections (already have screen coordinates)
    people.filter(p => p.isFriend && p.x && p.y).forEach(person => {
      cache.push({
        id: `person_${person.id}`,
        screenX: person.x,
        screenY: person.y,
        data: person
      });
    });
    
    // Cache field tile projections - re-project each time the map moves
    fieldTiles.filter(t => t.crowd_count >= 3).forEach(tile => {
      const [lat, lng] = geohashToCenter(tile.tile_id);
      const projection = projectLatLng(lng, lat);
      if (projection) {
        cache.push({
          id: `tile_${tile.tile_id}`,
          screenX: projection.x,
          screenY: projection.y,
          data: tile
        });
      }
    });
    
    return cache;
  }, [people, fieldTiles, mapRev]); // Add mapRev to trigger updates on map movement

  // Initialize constellation graphics
  useEffect(() => {
    if (!app || !container) return;

    const constellationGraphics = new Graphics();
    const friendConnections = new Graphics();
    
    container.addChild(friendConnections); // Friend lines behind everything
    container.addChild(constellationGraphics); // Constellation effects on top
    
    constellationGraphicsRef.current = constellationGraphics;
    friendConnectionsRef.current = friendConnections;

    return () => {
      constellationGraphics.destroy();
      friendConnections.destroy();
    };
  }, [app, container]);

  // Render constellation effects
  useEffect(() => {
    const constellationGraphics = constellationGraphicsRef.current;
    const friendConnections = friendConnectionsRef.current;
    
    if (!constellationGraphics || !friendConnections) return;

    // Clear previous frame
    constellationGraphics.clear();
    friendConnections.clear();

    // Only render during evening/night hours (6 PM - 6 AM)
    const currentHour = new Date().getHours();
    const isNightTime = currentHour >= 18 || currentHour <= 6;
    if (!isNightTime) return;

    // Calculate constellation intensity based on time
    const nightIntensity = calculateNightIntensity(currentHour);
    
    // Group friends by proximity using cached projections
    const friendProjections = cachedProjections.filter(cp => cp.id.startsWith('person_'));
    const friendClusters = createFriendClustersFromCache(friendProjections);
    
    // Draw constellation connections between friends
    drawFriendConnections(friendConnections, friendClusters, nightIntensity);
    
    // Draw constellation stars using cached tile projections
    const tileProjections = cachedProjections.filter(cp => cp.id.startsWith('tile_'));
    drawConstellationStarsFromCache(constellationGraphics, tileProjections, nightIntensity);
    
    // Add ambient constellation effects
    drawAmbientStars(constellationGraphics, nightIntensity);

  }, [cachedProjections]);

  return null; // This component only manages PIXI graphics
};

// Calculate how intense the night effects should be
function calculateNightIntensity(hour: number): number {
  if (hour >= 22 || hour <= 2) return 1.0; // Peak night (10 PM - 2 AM)
  if (hour >= 20 || hour <= 4) return 0.8; // Deep night (8 PM - 4 AM) 
  if (hour >= 18 || hour <= 6) return 0.5; // Dusk/dawn (6 PM - 6 AM)
  return 0.0; // Day time
}

// Group friends by proximity using cached projections for performance
function createFriendClustersFromCache(friendProjections: CachedProjection[]): CachedProjection[][] {
  const clusters: CachedProjection[][] = [];
  const visited = new Set<string>();
  
  const CLUSTER_DISTANCE = 150; // pixels
  
  friendProjections.forEach(friend => {
    if (visited.has(friend.id)) return;
    
    const cluster = [friend];
    visited.add(friend.id);
    
    // Find nearby friends to form a constellation
    friendProjections.forEach(otherFriend => {
      if (visited.has(otherFriend.id)) return;
      
      const distance = Math.sqrt(
        Math.pow(friend.screenX - otherFriend.screenX, 2) + 
        Math.pow(friend.screenY - otherFriend.screenY, 2)
      );
      
      if (distance <= CLUSTER_DISTANCE) {
        cluster.push(otherFriend);
        visited.add(otherFriend.id);
      }
    });
    
    // Only create constellation if we have multiple friends
    if (cluster.length >= 2) {
      clusters.push(cluster);
    }
  });
  
  return clusters;
}

// Draw elegant connecting lines between friends in constellations (cached version)
function drawFriendConnections(
  graphics: Graphics, 
  clusters: CachedProjection[][], 
  intensity: number
): void {
  clusters.forEach(cluster => {
    if (cluster.length < 2) return;
    
    // Draw connections between all friends in this cluster
    for (let i = 0; i < cluster.length; i++) {
      for (let j = i + 1; j < cluster.length; j++) {
        const friend1 = cluster[i];
        const friend2 = cluster[j];
        
        const distance = Math.sqrt(
          Math.pow(friend1.screenX - friend2.screenX, 2) + 
          Math.pow(friend1.screenY - friend2.screenY, 2)
        );
        
        // Only connect nearby friends (avoid crossing the entire screen)
        if (distance > 200) continue;
        
        // Create a subtle, animated connection line
        const alpha = (0.3 + 0.2 * Math.sin(Date.now() * 0.002)) * intensity;
        const lineWidth = 1 + intensity;
        
        // Gradient effect: stronger near friends, fading in middle
        graphics.lineStyle(lineWidth, 0x6366f1, alpha * 0.8);
        
        // Draw the connection with a subtle curve
        const midX = (friend1.screenX + friend2.screenX) / 2;
        const midY = (friend1.screenY + friend2.screenY) / 2;
        const curveOffset = 10 * Math.sin(Date.now() * 0.001 + distance * 0.01);
        
        graphics.moveTo(friend1.screenX, friend1.screenY);
        graphics.quadraticCurveTo(
          midX + curveOffset, 
          midY + curveOffset, 
          friend2.screenX, 
          friend2.screenY
        );
        
        // Add subtle sparkle effects along the line
        const sparkleCount = Math.floor(distance / 50);
        for (let k = 0; k < sparkleCount; k++) {
          const t = (k + 1) / (sparkleCount + 1);
          const sparkleX = friend1.screenX + (friend2.screenX - friend1.screenX) * t;
          const sparkleY = friend1.screenY + (friend2.screenY - friend1.screenY) * t;
          
          const sparkleIntensity = Math.sin(Date.now() * 0.005 + k) * 0.5 + 0.5;
          graphics.beginFill(0xffffff, alpha * sparkleIntensity * 0.6);
          graphics.drawCircle(sparkleX, sparkleY, 1);
          graphics.endFill();
        }
      }
    }
  });
}

// Draw enhanced constellation stars using cached projections for performance
function drawConstellationStarsFromCache(
  graphics: Graphics, 
  tileProjections: CachedProjection[], 
  intensity: number
): void {
  tileProjections.forEach(projection => {
    const tile = projection.data as FieldTile;
    const { screenX: x, screenY: y } = projection;
    const starSize = Math.min(20, Math.log2(tile.crowd_count) * 4);
    
    // Create a pulsing star effect
    const pulsePhase = Date.now() * 0.003 + x * 0.01;
    const pulse = 0.7 + 0.3 * Math.sin(pulsePhase);
    const alpha = intensity * pulse * 0.8;
    
    // Draw the main star body
    graphics.beginFill(0xffd700, alpha); // Golden color
    graphics.drawStar(x, y, 6, starSize * pulse, starSize * 0.5 * pulse);
    graphics.endFill();
    
    // Add a subtle glow
    graphics.beginFill(0xffd700, alpha * 0.3);
    graphics.drawCircle(x, y, starSize * 1.5 * pulse);
    graphics.endFill();
    
    // Add sparkle rays
    graphics.lineStyle(1, 0xffffff, alpha * 0.8);
    for (let i = 0; i < 4; i++) {
      const angle = (i * Math.PI / 2) + pulsePhase;
      const rayLength = starSize * 2;
      const x1 = x + Math.cos(angle) * rayLength;
      const y1 = y + Math.sin(angle) * rayLength;
      
      graphics.moveTo(x, y);
      graphics.lineTo(x1, y1);
    }
  });
}

// Add ambient background stars for atmosphere
function drawAmbientStars(graphics: Graphics, intensity: number): void {
  const starCount = Math.floor(20 * intensity);
  
  for (let i = 0; i < starCount; i++) {
    const x = Math.random() * window.innerWidth;
    const y = Math.random() * window.innerHeight;
    const size = 0.5 + Math.random() * 1.5;
    const twinkle = Math.sin(Date.now() * 0.001 + i) * 0.5 + 0.5;
    const alpha = intensity * 0.4 * twinkle;
    
    graphics.beginFill(0xffffff, alpha);
    graphics.drawCircle(x, y, size);
    graphics.endFill();
  }
}