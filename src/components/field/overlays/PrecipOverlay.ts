/**
 * Precip Overlay - Energy rain from high-intensity clusters
 * Spawns falling particles for clusters with high energy levels
 */

import * as PIXI from 'pixi.js';
import type { SocialCluster } from '@/types/field';
import { vibeToTint } from '@/lib/vibe/tokens';

const ADD_BLEND = 'add' as any; // PIXI v8 compatibility

interface RainDrop {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  baseAlpha: number;
  color: number;
  sprite: PIXI.Sprite;
}

export class PrecipOverlay {
  private container: PIXI.Container;
  private drops: RainDrop[] = [];
  private dropPool: PIXI.Sprite[] = [];
  private freeDrops: PIXI.Sprite[] = [];
  private maxDrops = 150;
  private precipTexture: PIXI.Texture;
  private tier: 'low' | 'mid' | 'high' = 'high';
  
  constructor(parent: PIXI.Container, renderer: PIXI.Renderer) {
    this.container = new PIXI.Container();
    this.container.label = 'Precip';
    
    // Create simple drop texture
    this.precipTexture = this.createDropTexture(renderer);
    
    // Pre-populate drop pool
    for (let i = 0; i < this.maxDrops; i++) {
      const drop = new PIXI.Sprite(this.precipTexture);
      drop.anchor.set(0.5);
      drop.blendMode = ADD_BLEND;
      drop.scale.set(0.8 + Math.random() * 0.4); // Vary size
      drop.visible = false;
      this.dropPool.push(drop);
    }
    
    this.freeDrops = [...this.dropPool];
    parent.addChild(this.container);
  }

  /**
   * Update precipitation system
   */
  update(clusters: SocialCluster[], deltaMS: number, zoom: number, deviceTier: string) {
    const dt = deltaMS / 1000;
    
    // Filter clusters properly for precip effects
    const validClusters = clusters.filter(c => 
      c.count >= 5 && // k-anon gate
      (c.energyLevel ?? 0.5) > 0.75 && // intensity threshold
      zoom >= 15 // zoom gate
    );
    
    // Spawn drops from high-intensity clusters
    this.spawnDrops(validClusters, dt, deviceTier);
    
    // Update existing drops
    this.updateDrops(dt);
  }

  private spawnDrops(clusters: SocialCluster[], dt: number, deviceTier: string) {
    // Tier-based caps
    if (this.tier === 'low') return; // No precip on low tier
    
    const maxSpawnRate = {
      low: 0,
      mid: 0.4,
      high: 1.0
    }[this.tier];
    
    for (const cluster of clusters) {
      const intensity = cluster.energyLevel ?? 0.5;
      
      // Only spawn for high-energy clusters
      if (intensity < 0.75) continue;
      
      // Spawn rate based on intensity and count
      const baseRate = (intensity - 0.75) / 0.25; // 0-1 scale
      const countMultiplier = Math.min(2, Math.log10(cluster.count) / Math.log10(50));
      const spawnRate = baseRate * countMultiplier * maxSpawnRate;
      
      // Probabilistic spawning
      if (Math.random() < spawnRate * dt) {
        this.emitDrop(cluster);
      }
    }
  }

  private emitDrop(cluster: SocialCluster) {
    if (this.drops.length >= this.maxDrops || this.freeDrops.length === 0) return;
    
    const sprite = this.freeDrops.pop()!;
    
    // Spawn around cluster perimeter, falling inward
    const spawnRadius = (cluster.glowRadius ?? 40) * 1.2;
    const angle = Math.random() * Math.PI * 2;
    const startX = cluster.x + Math.cos(angle) * spawnRadius;
    const startY = cluster.y + Math.sin(angle) * spawnRadius - 20; // Start above
    
    // Fall toward cluster center with slight randomness
    const targetX = cluster.x + (Math.random() - 0.5) * 20;
    const targetY = cluster.y + 150; // Fall distance
    
    const dx = targetX - startX;
    const dy = targetY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    const fallSpeed = 80 + Math.random() * 40; // px/s
    const fallTime = distance / fallSpeed;
    
    const drop: RainDrop = {
      x: startX,
      y: startY,
      vx: dx / fallTime,
      vy: dy / fallTime,
      life: fallTime,
      maxLife: fallTime,
      baseAlpha: 0.4 + Math.random() * 0.3,
      color: vibeToTint(cluster.vibe),
      sprite
    };
    
    // Setup sprite
    sprite.position.set(drop.x, drop.y);
    sprite.alpha = drop.baseAlpha;
    sprite.tint = drop.color;
    sprite.visible = true;
    
    this.container.addChild(sprite);
    this.drops.push(drop);
  }

  private updateDrops(dt: number) {
    for (let i = this.drops.length - 1; i >= 0; i--) {
      const drop = this.drops[i];
      
      // Update physics
      drop.x += drop.vx * dt;
      drop.y += drop.vy * dt;
      drop.life -= dt;
      
      if (drop.life <= 0) {
        // Recycle drop
        drop.sprite.visible = false;
        this.container.removeChild(drop.sprite);
        this.freeDrops.push(drop.sprite);
        this.drops.splice(i, 1);
      } else {
        // Update visual properties
        const lifeRatio = drop.life / drop.maxLife;
        drop.sprite.position.set(drop.x, drop.y);
        drop.sprite.alpha = drop.baseAlpha * lifeRatio;
      }
    }
  }

  private createDropTexture(renderer: PIXI.Renderer): PIXI.Texture {
    const g = new PIXI.Graphics();
    g.clear();
    
    // Small elongated drop shape
    g.ellipse(0, 0, 2, 4).fill({ color: 0xffffff, alpha: 0.8 });
    
    const texture = renderer.generateTexture(g);
    g.destroy();
    return texture;
  }

  /**
   * Set visibility alpha from AltitudeController
   */
  setAlpha(alpha: number) {
    this.container.alpha = alpha;
  }

  /**
   * Set quality based on device tier
   */
  setQuality(options: { tier: 'low' | 'mid' | 'high' }) {
    this.tier = options.tier;
    this.maxDrops = options.tier === 'low' ? 0 : options.tier === 'mid' ? 100 : 200;
  }

  /**
   * Get performance stats
   */
  getStats() {
    return {
      activeDrops: this.drops.length,
      poolAvailable: this.freeDrops.length
    };
  }

  /**
   * Clean up resources
   */
  destroy() {
    // Clear drops
    this.drops.forEach(drop => {
      drop.sprite.visible = false;
      if (drop.sprite.parent) {
        this.container.removeChild(drop.sprite);
      }
    });
    this.drops.length = 0;
    
    // Clear pools
    this.dropPool.forEach(sprite => sprite.destroy());
    this.dropPool.length = 0;
    this.freeDrops.length = 0;
    
    // Clean up texture and container
    this.precipTexture.destroy();
    this.container.removeChildren();
    this.container.destroy({ children: true });
  }
}