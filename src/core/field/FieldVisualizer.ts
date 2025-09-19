// Field visualization utilities for the living organism map
import type { ScreenTile } from '@/types/field';
import type { PersonState, GroupState } from './FieldCoupling';

export interface VisualizationConfig {
  showEnergyVectors: boolean;
  showPulseAnimation: boolean;
  showConvergenceTrails: boolean;
  energyDecayRate: number;
}

export class FieldVisualizer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animationFrame: number | null = null;
  
  constructor(private config: VisualizationConfig = {
    showEnergyVectors: true,
    showPulseAnimation: true,
    showConvergenceTrails: false,
    energyDecayRate: 0.05
  }) {}

  initialize(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.startAnimation();
  }

  private startAnimation() {
    const animate = () => {
      if (this.ctx && this.canvas) {
        this.clearCanvas();
        // Animation loop for living field visualization
      }
      this.animationFrame = requestAnimationFrame(animate);
    };
    animate();
  }

  private clearCanvas() {
    if (!this.ctx || !this.canvas) return;
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
  }

  drawPersonState(person: PersonState, x: number, y: number) {
    if (!this.ctx) return;
    
    // Draw energy aura
    const auraRadius = 20 + (person.energy * 30);
    const gradient = this.ctx.createRadialGradient(x, y, 0, x, y, auraRadius);
    gradient.addColorStop(0, `hsla(${this.vibeToHue(person.vibe)}, 70%, 60%, ${person.energy * 0.5})`);
    gradient.addColorStop(1, 'transparent');
    
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(x, y, auraRadius, 0, Math.PI * 2);
    this.ctx.fill();

    // Draw momentum vector
    if (this.config.showEnergyVectors && person.momentum > 0.1) {
      const vectorLength = person.momentum * 40;
      const angle = person.slope * Math.PI; // slope as directional indicator
      
      this.ctx.strokeStyle = `hsla(${this.vibeToHue(person.vibe)}, 80%, 70%, 0.8)`;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.moveTo(x, y);
      this.ctx.lineTo(x + Math.cos(angle) * vectorLength, y + Math.sin(angle) * vectorLength);
      this.ctx.stroke();
    }
  }

  drawGroupCohesion(group: GroupState, centerX: number, centerY: number) {
    if (!this.ctx) return;

    const cohesionRadius = 50 + (group.cohesion * 50);
    const fragmentation = group.fragmentationRisk;
    
    // Draw cohesion field
    const gradient = this.ctx.createRadialGradient(centerX, centerY, 0, centerX, centerY, cohesionRadius);
    gradient.addColorStop(0, `hsla(120, ${group.cohesion * 100}%, 60%, 0.3)`);
    gradient.addColorStop(0.7, `hsla(120, ${group.cohesion * 80}%, 50%, 0.1)`);
    gradient.addColorStop(1, 'transparent');
    
    this.ctx.fillStyle = gradient;
    this.ctx.beginPath();
    this.ctx.arc(centerX, centerY, cohesionRadius, 0, Math.PI * 2);
    this.ctx.fill();

    // Draw fragmentation indicators
    if (fragmentation > 0.3) {
      this.ctx.strokeStyle = `hsla(0, ${fragmentation * 100}%, 60%, ${fragmentation})`;
      this.ctx.lineWidth = 1;
      this.ctx.setLineDash([5, 5]);
      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, cohesionRadius * 0.8, 0, Math.PI * 2);
      this.ctx.stroke();
      this.ctx.setLineDash([]);
    }
  }

  drawVenuePulse(tile: ScreenTile, pulseEnergy: number, pulseSlope: number) {
    if (!this.ctx || !this.config.showPulseAnimation) return;

    const time = Date.now() / 1000;
    const pulsePhase = (time + tile.x * 0.01 + tile.y * 0.01) % (Math.PI * 2);
    const pulseIntensity = 0.5 + 0.5 * Math.sin(pulsePhase) * pulseEnergy;
    
    // Dynamic radius based on energy and slope
    const baseRadius = tile.radius;
    const dynamicRadius = baseRadius * (1 + pulseSlope * 0.3 + pulseIntensity * 0.2);
    
    // Pulsing color
    const alpha = 0.2 + (pulseIntensity * 0.3);
    this.ctx.fillStyle = `hsla(${tile.hsl.h}, ${tile.hsl.s}%, ${tile.hsl.l}%, ${alpha})`;
    
    this.ctx.beginPath();
    this.ctx.arc(tile.x, tile.y, dynamicRadius, 0, Math.PI * 2);
    this.ctx.fill();

    // Energy flow indicators
    if (Math.abs(pulseSlope) > 0.1) {
      const flowDirection = pulseSlope > 0 ? 1 : -1;
      const flowRadius = dynamicRadius + (10 * flowDirection);
      
      this.ctx.strokeStyle = tile.color;
      this.ctx.lineWidth = 2;
      this.ctx.beginPath();
      this.ctx.arc(tile.x, tile.y, flowRadius, 0, Math.PI * 2);
      this.ctx.stroke();
    }
  }

  private vibeToHue(vibe: string): number {
    const vibeHues: Record<string, number> = {
      'hype': 10,
      'social': 200,
      'chill': 240,
      'flowing': 180,
      'open': 120,
      'curious': 60,
      'solo': 300,
      'romantic': 320,
      'weird': 280,
      'down': 260,
    };
    return vibeHues[vibe] || 200;
  }

  dispose() {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
      this.animationFrame = null;
    }
    this.canvas = null;
    this.ctx = null;
  }
}