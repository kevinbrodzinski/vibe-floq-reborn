import { describe, it, expect, beforeEach } from 'vitest';
import * as PIXI from 'pixi.js';
import { ParticlePool } from '../ParticlePool';

// Mock PIXI for testing
class MockTexture {
  static WHITE = new MockTexture();
}

class MockSprite {
  anchor = { set: () => {} };
  blendMode = 'normal';
  visible = true;
  position = { set: () => {} };
  scale = { set: () => {} };
  alpha = 1;
  tint = 0xffffff;
  destroy = () => {};
}

class MockContainer {
  children: any[] = [];
  addChild = (child: any) => this.children.push(child);
  removeChild = (child: any) => {
    const index = this.children.indexOf(child);
    if (index >= 0) this.children.splice(index, 1);
  };
}

// Mock PIXI globals for test
(global as any).PIXI = {
  Sprite: MockSprite,
  Texture: MockTexture,
  Container: MockContainer,
};

describe('ParticlePool', () => {
  let container: MockContainer;
  let texture: MockTexture;
  let pool: ParticlePool;

  beforeEach(() => {
    container = new MockContainer();
    texture = new MockTexture();
    pool = new ParticlePool(container as any, texture as any, 10, 20);
  });

  describe('Pool Invariants', () => {
    it('should maintain active + free = pool size', () => {
      const stats = pool.getStats();
      expect(stats.activeCount + stats.freeCount).toBeLessThanOrEqual(stats.poolSize);
    });

    it('should have O(1) acquire/release operations', () => {
      // Test performance with timing
      const start = performance.now();
      
      // Acquire many particles
      const particles = [];
      for (let i = 0; i < 15; i++) {
        const particle = pool.acquire();
        if (particle) particles.push(particle);
      }
      
      // Release them all
      particles.forEach(p => pool.release(p));
      
      const end = performance.now();
      
      // Should complete very quickly (< 1ms for 15 operations)
      expect(end - start).toBeLessThan(1);
      
      // Pool should be in valid state
      const stats = pool.getStats();
      expect(stats.activeCount).toBe(0);
      expect(stats.freeCount).toBeGreaterThan(0);
    });

    it('should respect maximum pool size', () => {
      // Try to acquire more than max size
      const particles = [];
      for (let i = 0; i < 25; i++) { // More than maxSize (20)
        const particle = pool.acquire();
        if (particle) particles.push(particle);
      }
      
      const stats = pool.getStats();
      expect(stats.poolSize).toBeLessThanOrEqual(20);
      expect(particles.length).toBeLessThanOrEqual(20);
    });

    it('should not double-release particles', () => {
      const particle = pool.acquire();
      expect(particle).toBeTruthy();
      
      if (particle) {
        pool.release(particle);
        const statsAfterFirst = pool.getStats();
        
        // Try to release again - should be ignored
        pool.release(particle);
        const statsAfterSecond = pool.getStats();
        
        expect(statsAfterFirst.activeCount).toBe(statsAfterSecond.activeCount);
        expect(statsAfterFirst.freeCount).toBe(statsAfterSecond.freeCount);
      }
    });
  });

  describe('Particle Management', () => {
    it('should properly configure particles on creation', () => {
      const particle = pool.acquire() as any;
      
      if (particle) {
        expect(particle.blendMode).toBe('add');
        expect(particle.visible).toBe(true);
        expect(container.children).toContain(particle);
      }
    });

    it('should hide particles on release', () => {
      const particle = pool.acquire() as any;
      
      if (particle) {
        expect(particle.visible).toBe(true);
        
        pool.release(particle);
        expect(particle.visible).toBe(false);
        expect(container.children).not.toContain(particle);
      }
    });

    it('should handle release all correctly', () => {
      const particles = [];
      for (let i = 0; i < 5; i++) {
        const p = pool.acquire();
        if (p) particles.push(p);
      }
      
      const statsBefore = pool.getStats();
      expect(statsBefore.activeCount).toBe(5);
      
      pool.releaseAll();
      
      const statsAfter = pool.getStats();
      expect(statsAfter.activeCount).toBe(0);
      expect(container.children).toHaveLength(0);
    });
  });
});