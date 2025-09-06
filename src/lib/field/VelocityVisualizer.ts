import * as PIXI from 'pixi.js';
import { GraphicsPool } from '@/utils/graphicsPool';

/**
 * Phase 1: Velocity Visualizer for Field Canvas
 * Renders velocity vectors and flow indicators for particles
 */
export class VelocityVisualizer {
  private container: PIXI.Container;
  private graphicsPool: GraphicsPool;
  private activeVectors = new Map<string, PIXI.Graphics>();

  constructor(container: PIXI.Container) {
    this.container = container;
    this.graphicsPool = new GraphicsPool(); // Pool for vector graphics
  }

  /**
   * Draw a velocity vector for a particle
   */
  drawVelocityVector(
    particleId: string, 
    x: number, 
    y: number, 
    velocity: { vx: number; vy: number },
    color: number = 0xffffff,
    alpha: number = 0.6
  ) {
    // Skip if velocity is too small to visualize
    const speed = Math.hypot(velocity.vx, velocity.vy);
    if (speed < 0.1) return;

    let graphics = this.activeVectors.get(particleId);
    if (!graphics) {
      graphics = this.graphicsPool.acquire();
      this.activeVectors.set(particleId, graphics);
      this.container.addChild(graphics);
    }

    graphics.clear();
    graphics.alpha = alpha;

    // Scale velocity for visibility
    const scale = Math.min(50, speed * 200);
    const endX = x + velocity.vx * scale;
    const endY = y + velocity.vy * scale;

    // Draw velocity line
    graphics.lineStyle(2, color, 0.8);
    graphics.moveTo(x, y);
    graphics.lineTo(endX, endY);

    // Draw arrowhead
    const angle = Math.atan2(velocity.vy, velocity.vx);
    const arrowLength = Math.min(8, scale * 0.3);
    
    graphics.lineStyle(2, color, 1.0);
    graphics.moveTo(endX, endY);
    graphics.lineTo(
      endX - arrowLength * Math.cos(angle - 0.5),
      endY - arrowLength * Math.sin(angle - 0.5)
    );
    graphics.moveTo(endX, endY);
    graphics.lineTo(
      endX - arrowLength * Math.cos(angle + 0.5),
      endY - arrowLength * Math.sin(angle + 0.5)
    );
  }

  /**
   * Draw flow field visualization
   */
  drawFlowField(
    fieldData: Array<{
      x: number;
      y: number;
      velocity: { vx: number; vy: number };
      intensity: number;
    }>,
    spacing: number = 50
  ) {
    // Clear old flow field
    this.clearFlowField();

    fieldData.forEach((point, index) => {
      if (point.intensity > 0.1) {
        this.drawVelocityVector(
          `flow_${index}`,
          point.x,
          point.y,
          point.velocity,
          this.intensityToColor(point.intensity),
          point.intensity * 0.5
        );
      }
    });
  }

  /**
   * Clear specific velocity vector
   */
  clearVector(particleId: string) {
    const graphics = this.activeVectors.get(particleId);
    if (graphics) {
      this.container.removeChild(graphics);
      this.graphicsPool.release(graphics);
      this.activeVectors.delete(particleId);
    }
  }

  /**
   * Clear all flow field vectors
   */
  clearFlowField() {
    for (const [id, graphics] of this.activeVectors.entries()) {
      if (id.startsWith('flow_')) {
        this.container.removeChild(graphics);
        this.graphicsPool.release(graphics);
        this.activeVectors.delete(id);
      }
    }
  }

  /**
   * Clear all vectors
   */
  clearAll() {
    for (const [id, graphics] of this.activeVectors.entries()) {
      this.container.removeChild(graphics);
      this.graphicsPool.release(graphics);
    }
    this.activeVectors.clear();
  }

  /**
   * Convert intensity to color (blue to red gradient)
   */
  private intensityToColor(intensity: number): number {
    // Clamp intensity between 0 and 1
    const i = Math.max(0, Math.min(1, intensity));
    
    // Blue (low) to red (high) gradient
    const red = Math.floor(i * 255);
    const blue = Math.floor((1 - i) * 255);
    const green = 50; // Small amount of green for better visibility
    
    return (red << 16) | (green << 8) | blue;
  }

  /**
   * Update all vectors with fade animation
   */
  update(deltaTime: number) {
    // Fade out old vectors
    for (const graphics of this.activeVectors.values()) {
      if (graphics.alpha > 0.1) {
        graphics.alpha *= 0.98; // Slow fade
      }
    }
  }

  /**
   * Get performance stats
   */
  getStats() {
    return {
      activeVectors: this.activeVectors.size,
      poolSize: Object.keys(this.graphicsPool).length || 0
    };
  }
}