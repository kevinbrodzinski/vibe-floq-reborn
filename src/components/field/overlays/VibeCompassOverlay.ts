/**
 * Vibe Compass Overlay
 * Shows dominant flow direction and vibe near user position
 */

import * as PIXI from 'pixi.js';
import type { SocialCluster } from '@/types/field';
import { vibeToTint } from '@/lib/vibe/tokens';
import { classifyVibeToken, type VibeState } from '@/lib/vibe/classifier';

interface FlowVector {
  x: number;
  y: number;
  vx: number;
  vy: number;
  magnitude: number;
  heading: number;
  vibe: string;
  weight: number;
}

export class VibeCompassOverlay {
  private container: PIXI.Container;
  private compassGraphics: PIXI.Graphics;
  private compassPosition = { x: 0, y: 0 };
  private compassSize = 80;
  private updateFrequency = 2; // Hz
  private lastUpdate = 0;
  private currentFlow: FlowVector | null = null;
  private alpha = 0;
  private targetAlpha = 0;
  private fadeSpeed = 0.05;

  constructor(parent: PIXI.Container) {
    this.container = new PIXI.Container();
    this.container.label = 'VibeCompass';
    
    this.compassGraphics = new PIXI.Graphics();
    this.container.addChild(this.compassGraphics);
    
    parent.addChild(this.container);
  }

  /**
   * Update compass based on clusters and user position
   */
  update(
    clusters: SocialCluster[], 
    userPosition: { x: number; y: number },
    viewport: { width: number; height: number },
    deltaMS: number,
    zoom: number
  ) {
    const now = performance.now();
    
    // Position compass in bottom-right corner with margin
    this.compassPosition = {
      x: viewport.width - this.compassSize - 20,
      y: viewport.height - this.compassSize - 20
    };
    
    // Update flow calculation at specified frequency
    if (now - this.lastUpdate >= 1000 / this.updateFrequency) {
      this.currentFlow = this.calculateDominantFlow(clusters, userPosition, zoom);
      this.lastUpdate = now;
    }
    
    // Update visibility based on flow strength and cluster count
    const shouldShow = this.shouldShowCompass(clusters, zoom);
    this.targetAlpha = shouldShow ? 1 : 0;
    
    // Smooth fade transitions
    const dt = deltaMS / 1000;
    if (this.alpha < this.targetAlpha) {
      this.alpha = Math.min(this.targetAlpha, this.alpha + this.fadeSpeed);
    } else if (this.alpha > this.targetAlpha) {
      this.alpha = Math.max(this.targetAlpha, this.alpha - this.fadeSpeed);
    }
    
    // Render compass
    if (this.alpha > 0.01) {
      this.renderCompass();
    }
    
    this.container.alpha = this.alpha;
  }

  private calculateDominantFlow(
    clusters: SocialCluster[], 
    userPos: { x: number; y: number },
    zoom: number
  ): FlowVector | null {
    if (clusters.length < 3) return null; // Need minimum clusters for flow
    
    const maxRadius = 300; // Max influence radius in pixels
    const flows: FlowVector[] = [];
    
    for (const cluster of clusters) {
      if (!cluster.velocity) continue;
      
      const dx = cluster.x - userPos.x;
      const dy = cluster.y - userPos.y;
      const distance = Math.sqrt(dx * dx + dy * dy);
      
      if (distance > maxRadius) continue;
      
      // Weight by inverse distance and cluster energy
      const distanceWeight = 1 - (distance / maxRadius);
      const energyWeight = cluster.energyLevel ?? 0.5;
      const countWeight = Math.log10(Math.max(1, cluster.count)) / Math.log10(50);
      const weight = distanceWeight * energyWeight * countWeight;
      
      if (weight > 0.1) {
        const magnitude = Math.sqrt(cluster.velocity.vx ** 2 + cluster.velocity.vy ** 2);
        const heading = Math.atan2(cluster.velocity.vy, cluster.velocity.vx);
        
        flows.push({
          x: cluster.x,
          y: cluster.y,
          vx: cluster.velocity.vx,
          vy: cluster.velocity.vy,
          magnitude,
          heading,
          vibe: cluster.vibe,
          weight
        });
      }
    }
    
    if (flows.length === 0) return null;
    
    // Calculate weighted average flow
    let totalVx = 0;
    let totalVy = 0;
    let totalWeight = 0;
    let dominantVibe = 'social';
    let maxVibeWeight = 0;
    
    const vibeWeights = new Map<string, number>();
    
    for (const flow of flows) {
      totalVx += flow.vx * flow.weight;
      totalVy += flow.vy * flow.weight;
      totalWeight += flow.weight;
      
      // Track dominant vibe
      const currentVibeWeight = (vibeWeights.get(flow.vibe) ?? 0) + flow.weight;
      vibeWeights.set(flow.vibe, currentVibeWeight);
      
      if (currentVibeWeight > maxVibeWeight) {
        maxVibeWeight = currentVibeWeight;
        dominantVibe = flow.vibe;
      }
    }
    
    if (totalWeight === 0) return null;
    
    const avgVx = totalVx / totalWeight;
    const avgVy = totalVy / totalWeight;
    const avgMagnitude = Math.sqrt(avgVx ** 2 + avgVy ** 2);
    const avgHeading = Math.atan2(avgVy, avgVx);
    
    return {
      x: userPos.x,
      y: userPos.y,
      vx: avgVx,
      vy: avgVy,
      magnitude: avgMagnitude,
      heading: avgHeading,
      vibe: dominantVibe,
      weight: totalWeight / flows.length
    };
  }

  private shouldShowCompass(clusters: SocialCluster[], zoom: number): boolean {
    return clusters.length >= 5 && 
           zoom >= 15 && 
           this.currentFlow !== null && 
           this.currentFlow.magnitude > 0.02;
  }

  private renderCompass() {
    if (!this.currentFlow) return;
    
    const g = this.compassGraphics;
    g.clear();
    
    const { x, y } = this.compassPosition;
    const radius = this.compassSize / 2;
    const centerX = x + radius;
    const centerY = y + radius;
    
    // Background circle
    g.circle(centerX, centerY, radius)
      .fill({ color: 0x000000, alpha: 0.3 });
    
    // Border
    g.circle(centerX, centerY, radius)
      .stroke({ color: 0xffffff, alpha: 0.5, width: 1 });
    
    // Flow arrow
    const arrowLength = Math.min(radius * 0.8, this.currentFlow.magnitude * 200);
    const endX = centerX + Math.cos(this.currentFlow.heading) * arrowLength;
    const endY = centerY + Math.sin(this.currentFlow.heading) * arrowLength;
    
    // Classify vibe for consistent color
    const vibeState: VibeState = {
      valence: this.currentFlow.magnitude > 0.5 ? 0.6 : 0.2, // High flow = positive
      arousal: this.currentFlow.magnitude
    };
    const vibeToken = classifyVibeToken(vibeState, this.currentFlow.vibe as any);
    const tint = vibeToTint(vibeToken);
    
    // Arrow shaft
    g.moveTo(centerX, centerY)
      .lineTo(endX, endY)
      .stroke({ color: tint, width: 3, alpha: 0.8 });
    
    // Arrow head
    const headSize = 8;
    const headAngle = 0.5;
    const head1X = endX - headSize * Math.cos(this.currentFlow.heading - headAngle);
    const head1Y = endY - headSize * Math.sin(this.currentFlow.heading - headAngle);
    const head2X = endX - headSize * Math.cos(this.currentFlow.heading + headAngle);
    const head2Y = endY - headSize * Math.sin(this.currentFlow.heading + headAngle);
    
    g.moveTo(endX, endY)
      .lineTo(head1X, head1Y)
      .moveTo(endX, endY)
      .lineTo(head2X, head2Y)
      .stroke({ color: tint, width: 2, alpha: 0.8 });
    
    // Center dot
    g.circle(centerX, centerY, 3)
      .fill({ color: tint, alpha: 0.9 });
  }

  /**
   * Set visibility alpha from AltitudeController
   */
  setAlpha(alpha: number) {
    this.targetAlpha = alpha;
  }

  /**
   * Get current flow data for debugging
   */
  getCurrentFlow(): FlowVector | null {
    return this.currentFlow;
  }

  /**
   * Clean up resources
   */
  destroy() {
    this.compassGraphics.clear();
    this.container.destroy({ children: true });
  }
}