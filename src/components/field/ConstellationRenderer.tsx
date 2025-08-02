import React, { useRef, useEffect } from 'react';
import { Graphics, Container, Application } from 'pixi.js';
import { projectLatLng, getMapInstance } from '@/lib/geo/project';
import type { Person } from '@/components/field/contexts/FieldSocialContext';
import type { FieldTile } from '@/types/field';

interface ConstellationRendererProps {
  people: Person[];
  fieldTiles: FieldTile[];
  app: Application | null;
  container: Container | null;
  timeWarpHour: number;
}

export const ConstellationRenderer: React.FC<ConstellationRendererProps> = ({
  people,
  fieldTiles,
  app,
  container,
  timeWarpHour
}) => {
  const constellationGraphicsRef = useRef<Graphics | null>(null);
  const friendConnectionsRef = useRef<Graphics | null>(null);

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
    const isNightTime = timeWarpHour >= 18 || timeWarpHour <= 6;
    if (!isNightTime) return;

    // Calculate constellation intensity based on time
    const nightIntensity = calculateNightIntensity(timeWarpHour);
    
    // Group friends by proximity to create constellation clusters
    const friendClusters = createFriendClusters(people);
    
    // Draw constellation connections between friends
    drawFriendConnections(friendConnections, friendClusters, nightIntensity);
    
    // Draw constellation stars (enhanced cluster visualization)
    drawConstellationStars(constellationGraphics, fieldTiles, nightIntensity);
    
    // Add ambient constellation effects
    drawAmbientStars(constellationGraphics, nightIntensity);

  }, [people, fieldTiles, timeWarpHour]);

  return null; // This component only manages PIXI graphics
};

// Calculate how intense the night effects should be
function calculateNightIntensity(hour: number): number {
  if (hour >= 22 || hour <= 2) return 1.0; // Peak night (10 PM - 2 AM)
  if (hour >= 20 || hour <= 4) return 0.8; // Deep night (8 PM - 4 AM) 
  if (hour >= 18 || hour <= 6) return 0.5; // Dusk/dawn (6 PM - 6 AM)
  return 0.0; // Day time
}

// Group friends by proximity to create meaningful constellations
function createFriendClusters(people: Person[]): Person[][] {
  const friends = people.filter(p => p.isFriend && p.x && p.y);
  const clusters: Person[][] = [];
  const visited = new Set<string>();
  
  const CLUSTER_DISTANCE = 150; // pixels
  
  friends.forEach(friend => {
    if (visited.has(friend.id)) return;
    
    const cluster = [friend];
    visited.add(friend.id);
    
    // Find nearby friends to form a constellation
    friends.forEach(otherFriend => {
      if (visited.has(otherFriend.id)) return;
      
      const distance = Math.sqrt(
        Math.pow(friend.x - otherFriend.x, 2) + 
        Math.pow(friend.y - otherFriend.y, 2)
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

// Draw elegant connecting lines between friends in constellations
function drawFriendConnections(
  graphics: Graphics, 
  clusters: Person[][], 
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
          Math.pow(friend1.x - friend2.x, 2) + 
          Math.pow(friend1.y - friend2.y, 2)
        );
        
        // Only connect nearby friends (avoid crossing the entire screen)
        if (distance > 200) continue;
        
        // Create a subtle, animated connection line
        const alpha = (0.3 + 0.2 * Math.sin(Date.now() * 0.002)) * intensity;
        const lineWidth = 1 + intensity;
        
        // Gradient effect: stronger near friends, fading in middle
        graphics.lineStyle(lineWidth, 0x6366f1, alpha * 0.8);
        
        // Draw the connection with a subtle curve
        const midX = (friend1.x + friend2.x) / 2;
        const midY = (friend1.y + friend2.y) / 2;
        const curveOffset = 10 * Math.sin(Date.now() * 0.001 + distance * 0.01);
        
        graphics.moveTo(friend1.x, friend1.y);
        graphics.quadraticCurveTo(
          midX + curveOffset, 
          midY + curveOffset, 
          friend2.x, 
          friend2.y
        );
        
        // Add subtle sparkle effects along the line
        const sparkleCount = Math.floor(distance / 50);
        for (let k = 0; k < sparkleCount; k++) {
          const t = (k + 1) / (sparkleCount + 1);
          const sparkleX = friend1.x + (friend2.x - friend1.x) * t;
          const sparkleY = friend1.y + (friend2.y - friend1.y) * t;
          
          const sparkleIntensity = Math.sin(Date.now() * 0.005 + k) * 0.5 + 0.5;
          graphics.beginFill(0xffffff, alpha * sparkleIntensity * 0.6);
          graphics.drawCircle(sparkleX, sparkleY, 1);
          graphics.endFill();
        }
      }
    }
  });
}

// Draw enhanced constellation stars for field tiles
function drawConstellationStars(
  graphics: Graphics, 
  fieldTiles: FieldTile[], 
  intensity: number
): void {
  const visibleTiles = fieldTiles.filter(t => t.crowd_count >= 3);
  
  visibleTiles.forEach(tile => {
    const [lat, lng] = tile.tile_id.split('').map((_, i, arr) => {
      // Simple geohash approximation for demo
      return i < arr.length / 2 ? 
        40.7128 + (parseInt(arr[i], 36) - 18) * 0.01 : 
        -74.0060 + (parseInt(arr[i], 36) - 18) * 0.01;
    });
    
    const projection = projectLatLng(lng, lat);
    if (!projection) return;
    
    const { x, y } = projection;
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