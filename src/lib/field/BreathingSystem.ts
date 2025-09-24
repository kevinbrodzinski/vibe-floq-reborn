import * as PIXI from 'pixi.js';
import type { SocialCluster } from '@/types/field';
import { vibeToTint } from '@/lib/vibe/tokens';
import { ATMO, FIELD_LOD } from '@/lib/field/constants';
import { visualTokens } from '@/lib/vibe/tokens';
import { generateTexture } from '@/lib/pixi/textureHelpers';
import { ADD_BLEND } from '@/lib/pixi/blendModes';

interface BreathingState {
  phase: number;
  rate: number;
  intensity: number;
  scale: number;
  alpha: number;
  lastUpdate: number;
}

interface ParticleState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  baseScale: number;
  sprite: PIXI.Sprite;
}

/**
 * Phase 2: Breathing and particle system for living social clusters
 * Uses pre-baked circle texture and sprites (RN-safe), no DOM canvas
 */
export class BreathingSystem {
  private states = new Map<string, BreathingState>();
  private glowSprites = new Map<string, PIXI.Sprite>();
  private particles: ParticleState[] = [];
  private particlePool: PIXI.Sprite[] = [];
  private freeParticles: PIXI.Sprite[] = [];
  
  private glowContainer: PIXI.Container;
  private particleContainer: PIXI.ParticleContainer;
  private maxParticles = ATMO.PARTICLE_CAP;
  private circleTex: PIXI.Texture;

  constructor(parent: PIXI.Container, private renderer: PIXI.Renderer) {
    // Build RN-safe glow texture using Graphics + renderer
    const g = new PIXI.Graphics();
    g.clear();
    g.circle(0, 0, 64).fill({ color: 0xffffff, alpha: 0.08 });
    g.circle(0, 0, 42).fill({ color: 0xffffff, alpha: 0.20 });
    g.circle(0, 0, 21).fill({ color: 0xffffff, alpha: 0.50 });
    this.circleTex = generateTexture(this.renderer, g);
    g.destroy();

    // Layers
    this.glowContainer = new PIXI.Container();
    this.glowContainer.label = 'ClusterGlow';

    this.particleContainer = new PIXI.ParticleContainer();
    this.particleContainer.label = 'BreathingParticles';

    parent.addChild(this.glowContainer);
    parent.addChild(this.particleContainer);

    // Pre-populate particle pool with static properties set once
    for (let i = 0; i < this.maxParticles; i++) {
      const particle = new PIXI.Sprite(PIXI.Texture.WHITE);
      particle.anchor.set(0.5);
      particle.blendMode = ADD_BLEND;
      particle.width = visualTokens.atmo.particleSize;
      particle.height = visualTokens.atmo.particleSize;
      particle.visible = false;
      this.particlePool.push(particle);
    }
    // Initialize free list with all sprites
    this.freeParticles = [...this.particlePool];
  }

  /**
   * Update breathing system using existing PIXI sprites instead of Graphics
   */
  updateSprites(
    clusters: SocialCluster[],
    clusterSprites: Map<string, any>,
    deltaMS: number
  ) {
    const dt = deltaMS / 1000;
    const now = performance.now();
    const activeIds = new Set<string>();

    clusters.forEach(cluster => {
      // Privacy gate: only process clusters with sufficient count
      if (cluster.count < FIELD_LOD.K_MIN) return;
      
      activeIds.add(cluster.id);
      this.updateClusterBreathingSprite(cluster, clusterSprites, dt, now);
    });

    this.updateParticles(dt);
    this.synchronizeBreathing(clusters, dt);
    this.cleanupInactive(activeIds);
  }

  private updateClusterBreathingSprite(
    cluster: SocialCluster,
    clusterSprites: Map<string, any>,
    dt: number,
    now: number
  ) {
    const sprite = clusterSprites.get(cluster.id);
    if (!sprite) return;

    // Get or create breathing state
    let state = this.states.get(cluster.id);
    if (!state) {
      state = {
        phase: cluster.breathingPhase || Math.random() * Math.PI * 2,
        rate: cluster.breathingRate || 25,
        intensity: cluster.pulseIntensity || 0.5,
        scale: 1,
        alpha: 0.6,
        lastUpdate: now
      };
      this.states.set(cluster.id, state);
    }

    // Smooth parameter updates
    const targetRate = cluster.breathingRate || 25;
    const targetIntensity = cluster.pulseIntensity || 0.5;
    
    state.rate += (targetRate - state.rate) * dt * 0.5;
    state.intensity += (targetIntensity - state.intensity) * dt * 2;

    // Advance breathing phase
    const freq = state.rate / 60;
    state.phase += freq * 2 * Math.PI * dt;
    state.phase %= (2 * Math.PI);

    // Calculate breathing effect
    const breath = (Math.sin(state.phase) + 1) / 2;
    const easedBreath = this.easeInOutSine(breath);

    // Update sprite visual properties
    const energyLevel = cluster.energyLevel || 0.5;
    const baseScale = 1 + (0.15 * easedBreath * state.intensity);
    const baseAlpha = 0.6 + (0.3 * easedBreath * state.intensity);

    // Smooth transitions
    state.scale += (baseScale - state.scale) * dt * 8;
    state.alpha += (baseAlpha - state.alpha) * dt * 8;

    // Apply to sprite (assumes sprite is a round texture)
    sprite.scale.set(state.scale);
    sprite.alpha = state.alpha;
    sprite.tint = vibeToTint(cluster.vibe);

    // Update glow via separate sprite using circle texture
    this.updateGlow(cluster, state, easedBreath);

    // Emit particles for high-energy clusters
    if (breath > 0.9 && energyLevel > 0.6 && Math.random() < 0.2) {
      this.emitParticles(cluster, state);
    }

    state.lastUpdate = now;
  }

  private updateGlow(cluster: SocialCluster, state: BreathingState, breath: number) {
    let glow = this.glowSprites.get(cluster.id);
    if (!glow) {
      glow = new PIXI.Sprite(this.circleTex);
      glow.anchor.set(0.5);
      glow.blendMode = ADD_BLEND;
      this.glowContainer.addChild(glow);
      this.glowSprites.set(cluster.id, glow);
    }

    const glowRadius = cluster.glowRadius || Math.sqrt(cluster.count) * 12;
    glow.position.set(cluster.x, cluster.y);
    glow.scale.set((glowRadius * state.scale) / 64);
    glow.alpha = visualTokens.atmo.glowAlphaBase * (0.8 + breath * 0.2);
    glow.tint = vibeToTint(cluster.vibe);
  }

  private emitParticles(cluster: SocialCluster, state: BreathingState) {
    // Privacy and performance gates
    if (cluster.count < FIELD_LOD.K_MIN) return;
    
    const count = Math.floor(2 + (cluster.energyLevel || 0.5) * 4);
    
    for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
      // O(1) acquire from free list
      const sprite = this.freeParticles.pop();
      if (!sprite) continue;

      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * (cluster.glowRadius || 40) * 0.5;
      const speed = 20 + Math.random() * 20;
      const baseScale = 0.6 + Math.random() * 0.4;
      
      const particle: ParticleState = {
        x: cluster.x + Math.cos(angle) * dist, // Already in pixel space
        y: cluster.y + Math.sin(angle) * dist, // Already in pixel space  
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 15, // Slight upward bias
        life: 1,
        maxLife: 1.5 + Math.random() * 1,
        baseScale,
        sprite
      };

      // Static properties already set at pool creation
      sprite.position.set(particle.x, particle.y);
      sprite.scale.set(baseScale);
      sprite.alpha = 1;
      sprite.tint = vibeToTint(cluster.vibe);
      sprite.visible = true;
      
      this.particleContainer.addChild(sprite);
      this.particles.push(particle);
    }
  }

  private updateParticles(dt: number) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const particle = this.particles[i];
      
      // Update physics
      particle.x += particle.vx * dt;
      particle.y += particle.vy * dt;
      particle.vy += 40 * dt; // Gravity
      particle.life -= dt / particle.maxLife;
      
      if (particle.life <= 0) {
        // O(1) recycle to free list
        particle.sprite.visible = false;
        this.particleContainer.removeChild(particle.sprite);
        this.freeParticles.push(particle.sprite);
        this.particles.splice(i, 1);
      } else {
        // Update visual properties only for live particles
        particle.sprite.position.set(particle.x, particle.y);
        particle.sprite.alpha = particle.life * particle.life; // Fade out quadratically
        particle.sprite.scale.set(particle.baseScale * particle.life);
      }
    }
  }

  private synchronizeBreathing(clusters: SocialCluster[], dt: number) {
    // Use pixel-space grid for proper neighborhood coupling
    const CELL = 150; // pixels
    const K = 0.05 * dt;
    const bins = new Map<string, string[]>();
    
    // Spatial binning in pixel coordinates
    for (const c of clusters) {
      const gx = (c.x / CELL) | 0; // x,y already in pixel space from worker
      const gy = (c.y / CELL) | 0;
      const k = `${gx}:${gy}`;
      const bucket = bins.get(k) ?? [];
      bucket.push(c.id);
      bins.set(k, bucket);
    }
    
    // Order-independent phase adjustments
    const delta = new Map<string, number>();
    const neigh = [[0,0],[1,0],[0,1],[1,1],[-1,0],[0,-1],[-1,-1],[1,-1],[-1,1]];
    
    for (const [bk, ids] of bins) {
      const [gx, gy] = bk.split(':').map(Number);
      for (const [dx,dy] of neigh) {
        const other = bins.get(`${gx+dx}:${gy+dy}`);
        if (!other) continue;
        
        for (const a of ids) {
          for (const b of other) {
            if (a < b) {
              const sa = this.states.get(a);
              const sb = this.states.get(b);
              if (!sa || !sb) continue;
              
              const diff = sb.phase - sa.phase;
              const adj = Math.sin(diff) * K;
              delta.set(a, (delta.get(a) ?? 0) + adj);
              delta.set(b, (delta.get(b) ?? 0) - adj);
            }
          }
        }
      }
    }
    
    // Apply accumulated adjustments
    for (const [id, d] of delta) {
      const s = this.states.get(id);
      if (s) {
        s.phase = (s.phase + d) % (Math.PI * 2);
      }
    }
  }

  private cleanupInactive(activeIds: Set<string>) {
    for (const [id] of this.states) {
      if (!activeIds.has(id)) {
        this.states.delete(id);
        
        const glow = this.glowSprites.get(id);
        if (glow) {
          this.glowContainer.removeChild(glow);
          glow.destroy();
          this.glowSprites.delete(id);
        }
      }
    }
  }

  private easeInOutSine(t: number): number {
    return -(Math.cos(Math.PI * t) - 1) / 2;
  }

  /**
   * Clean up resources
   */
  destroy() {
    // Clear all particles
    this.particles.forEach(particle => {
      particle.sprite.visible = false;
      this.particleContainer.removeChild(particle.sprite);
    });
    this.particles.length = 0;

    // Clear glow sprites
    this.glowSprites.forEach(glow => {
      this.glowContainer.removeChild(glow);
      glow.destroy();
    });
    this.glowSprites.clear();

    // Clear states
    this.states.clear();

    // Destroy containers
    this.glowContainer.destroy({ children: true });
    this.particleContainer.destroy({ children: true });
  }

  /**
   * Get performance stats
   */
  getStats() {
    return {
      activeBreathingStates: this.states.size,
      activeParticles: this.particles.length,
      glowSprites: this.glowSprites.size,
      particlePoolAvailable: this.particlePool.filter(p => !p.visible).length
    };
  }
}