import * as PIXI from 'pixi.js';
import type { SocialCluster } from '@/types/field';
import { vibeToTint } from '@/lib/vibe/tokens';

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
  sprite: PIXI.Sprite;
}

/**
 * Phase 2: Breathing and particle system for living social clusters
 * Creates organic breathing animations with synchronized phases and particle emission
 * Simplified to work with existing PIXI Sprites instead of Graphics
 */
export class BreathingSystem {
  private states = new Map<string, BreathingState>();
  private glowSprites = new Map<string, PIXI.Sprite>();
  private particles: ParticleState[] = [];
  private particlePool: PIXI.Sprite[] = [];
  
  private glowContainer: PIXI.Container;
  private particleContainer: PIXI.ParticleContainer;
  private maxParticles = 100; // Reduced for better performance

  constructor(parent: PIXI.Container) {
    // Glow layer with subtle blur effect
    this.glowContainer = new PIXI.Container();
    this.glowContainer.label = 'ClusterGlow';
    
    // High-performance particle container
    this.particleContainer = new PIXI.ParticleContainer();
    this.particleContainer.label = 'BreathingParticles';
    
    parent.addChild(this.glowContainer);
    parent.addChild(this.particleContainer);
    
    // Pre-populate particle pool
    for (let i = 0; i < this.maxParticles; i++) {
      const particle = new PIXI.Sprite(PIXI.Texture.WHITE);
      particle.anchor.set(0.5);
      particle.width = 2;
      particle.height = 2;
      particle.visible = false;
      this.particlePool.push(particle);
    }
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

    // Apply to sprite
    sprite.scale.set(state.scale);
    sprite.alpha = state.alpha;

    // Update glow
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
      glow = this.createGlowSprite();
      this.glowContainer.addChild(glow);
      this.glowSprites.set(cluster.id, glow);
    }

    const glowRadius = cluster.glowRadius || Math.sqrt(cluster.count) * 12;
    
    glow.position.set(cluster.x, cluster.y);
    glow.scale.set((glowRadius * state.scale) / 64);
    glow.alpha = state.alpha * 0.3 * (0.8 + breath * 0.2);
    glow.tint = vibeToTint(cluster.vibe);
  }

  private createGlowSprite(): PIXI.Sprite {
    // Create radial gradient texture for glow
    const canvas = document.createElement('canvas');
    const size = 128;
    canvas.width = canvas.height = size;
    const ctx = canvas.getContext('2d')!;
    
    const gradient = ctx.createRadialGradient(size/2, size/2, 0, size/2, size/2, size/2);
    gradient.addColorStop(0, 'rgba(255,255,255,1)');
    gradient.addColorStop(0.3, 'rgba(255,255,255,0.6)');
    gradient.addColorStop(0.7, 'rgba(255,255,255,0.2)');
    gradient.addColorStop(1, 'rgba(255,255,255,0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    
    const texture = PIXI.Texture.from(canvas);
    const sprite = new PIXI.Sprite(texture);
    sprite.anchor.set(0.5);
    
    return sprite;
  }

  private emitParticles(cluster: SocialCluster, state: BreathingState) {
    const count = Math.floor(2 + (cluster.energyLevel || 0.5) * 4);
    
    for (let i = 0; i < count && this.particles.length < this.maxParticles; i++) {
      const sprite = this.particlePool.find(p => !p.visible);
      if (!sprite) continue;

      const angle = Math.random() * Math.PI * 2;
      const dist = Math.random() * (cluster.glowRadius || 40) * 0.5;
      const speed = 20 + Math.random() * 20;
      
      const particle: ParticleState = {
        x: cluster.x + Math.cos(angle) * dist,
        y: cluster.y + Math.sin(angle) * dist,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 15, // Slight upward bias
        life: 1,
        maxLife: 1.5 + Math.random() * 1, // 1.5-2.5 second lifetime
        sprite
      };

      sprite.position.set(particle.x, particle.y);
      sprite.scale.set(0.5 + Math.random() * 0.3);
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
        // Remove dead particle
        particle.sprite.visible = false;
        this.particleContainer.removeChild(particle.sprite);
        this.particles.splice(i, 1);
      } else {
        // Update visual properties
        particle.sprite.position.set(particle.x, particle.y);
        particle.sprite.alpha = particle.life * particle.life; // Fade out quadratically
        
        // Shrink over time
        const scale = particle.life * (0.5 + Math.random() * 0.3);
        particle.sprite.scale.set(scale);
      }
    }
  }

  private synchronizeBreathing(clusters: SocialCluster[], dt: number) {
    const SYNC_RADIUS = 120;
    const SYNC_STRENGTH = 0.03;
    
    for (let i = 0; i < clusters.length; i++) {
      for (let j = i + 1; j < clusters.length; j++) {
        const dist = Math.hypot(
          clusters[i].x - clusters[j].x,
          clusters[i].y - clusters[j].y
        );
        
        if (dist < SYNC_RADIUS) {
          const state1 = this.states.get(clusters[i].id);
          const state2 = this.states.get(clusters[j].id);
          
          if (state1 && state2) {
            // Pull phases together based on proximity
            const influence = 1 - (dist / SYNC_RADIUS);
            const phaseDiff = state2.phase - state1.phase;
            const adjustment = Math.sin(phaseDiff) * SYNC_STRENGTH * influence * dt;
            
            state1.phase += adjustment;
            state2.phase -= adjustment;
          }
        }
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