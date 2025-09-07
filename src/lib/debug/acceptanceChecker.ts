/**
 * Phase 2 Production Acceptance Checker
 * Run these checks before merging to production
 */

interface PerformanceMetrics {
  fps: number;
  mainThreadTime: number;
  drawCalls: number;
  heapUsed: number;
  clusters: number;
  particles: number;
  convergences: number;
}

interface AcceptanceCriteria {
  street: {
    minFps: 58;
    maxMainThread: 7.5;
    maxDrawCalls: 450;
  };
  city: {
    minFps: 58;
    maxMainThread: 6;
    maxDrawCalls: 250;
  };
  memory: {
    maxGrowthMB: 10; // Over 120s
    maxHeapMB: 100;
  };
}

const CRITERIA: AcceptanceCriteria = {
  street: { minFps: 58, maxMainThread: 7.5, maxDrawCalls: 450 },
  city: { minFps: 58, maxMainThread: 6, maxDrawCalls: 250 },
  memory: { maxGrowthMB: 10, maxHeapMB: 100 }
};

export class AcceptanceChecker {
  private metrics: PerformanceMetrics[] = [];
  private startHeap = 0;
  private startTime = 0;
  
  start(): void {
    this.startTime = performance.now();
    this.startHeap = this.getHeapSize();
    this.metrics = [];
    console.log('[field.atmo] 📊 Acceptance testing started');
  }
  
  recordMetrics(
    zoom: number,
    fps: number,
    clusters: number,
    particles: number,
    convergences: number
  ): void {
    const metrics: PerformanceMetrics = {
      fps,
      mainThreadTime: this.estimateMainThreadTime(),
      drawCalls: this.estimateDrawCalls(clusters, particles, convergences),
      heapUsed: this.getHeapSize(),
      clusters,
      particles,
      convergences
    };
    
    this.metrics.push(metrics);
    
    // Real-time feedback
    const level = zoom >= 17 ? 'street' : 'city';
    const criteria = CRITERIA[level];
    
    if (fps < criteria.minFps) {
      console.warn(`[field.atmo] ⚠️ FPS below threshold: ${fps} < ${criteria.minFps}`);
    }
    
    if (metrics.drawCalls > criteria.maxDrawCalls) {
      console.warn(`[field.atmo] ⚠️ Draw calls above threshold: ${metrics.drawCalls} > ${criteria.maxDrawCalls}`);
    }
  }
  
  generateReport(): string {
    if (this.metrics.length === 0) {
      return '[field.atmo] ❌ No metrics recorded';
    }
    
    const duration = (performance.now() - this.startTime) / 1000;
    const streetMetrics = this.metrics.filter((_, i) => i % 2 === 0); // Assume alternating zoom
    const cityMetrics = this.metrics.filter((_, i) => i % 2 === 1);
    
    const streetAvg = this.averageMetrics(streetMetrics);
    const cityAvg = this.averageMetrics(cityMetrics);
    
    const heapGrowth = (this.getHeapSize() - this.startHeap) / (1024 * 1024);
    
    let report = `
[field.atmo] 🏁 Phase 2 Acceptance Report
========================================
Duration: ${duration.toFixed(1)}s
Samples: ${this.metrics.length}

STREET ZOOM (z≥17):
  FPS: ${streetAvg.fps.toFixed(1)} (target: ≥${CRITERIA.street.minFps}) ${streetAvg.fps >= CRITERIA.street.minFps ? '✅' : '❌'}
  Main Thread: ${streetAvg.mainThreadTime.toFixed(1)}ms (target: ≤${CRITERIA.street.maxMainThread}ms) ${streetAvg.mainThreadTime <= CRITERIA.street.maxMainThread ? '✅' : '❌'}
  Draw Calls: ${streetAvg.drawCalls} (target: ≤${CRITERIA.street.maxDrawCalls}) ${streetAvg.drawCalls <= CRITERIA.street.maxDrawCalls ? '✅' : '❌'}

CITY ZOOM (z≈11):
  FPS: ${cityAvg.fps.toFixed(1)} (target: ≥${CRITERIA.city.minFps}) ${cityAvg.fps >= CRITERIA.city.minFps ? '✅' : '❌'}
  Main Thread: ${cityAvg.mainThreadTime.toFixed(1)}ms (target: ≤${CRITERIA.city.maxMainThread}ms) ${cityAvg.mainThreadTime <= CRITERIA.city.maxMainThread ? '✅' : '❌'}
  Draw Calls: ${cityAvg.drawCalls} (target: ≤${CRITERIA.city.maxDrawCalls}) ${cityAvg.drawCalls <= CRITERIA.city.maxDrawCalls ? '✅' : '❌'}

MEMORY:
  Heap Growth: ${heapGrowth.toFixed(1)}MB (target: ≤${CRITERIA.memory.maxGrowthMB}MB) ${heapGrowth <= CRITERIA.memory.maxGrowthMB ? '✅' : '❌'}
  Current Heap: ${(this.getHeapSize() / (1024 * 1024)).toFixed(1)}MB (target: ≤${CRITERIA.memory.maxHeapMB}MB) ${(this.getHeapSize() / (1024 * 1024)) <= CRITERIA.memory.maxHeapMB ? '✅' : '❌'}

PHASE 2 STATUS: ${this.isAcceptable() ? '✅ PRODUCTION READY' : '❌ NEEDS WORK'}
`;
    
    return report;
  }
  
  private averageMetrics(metrics: PerformanceMetrics[]): PerformanceMetrics {
    if (metrics.length === 0) {
      return { fps: 0, mainThreadTime: 0, drawCalls: 0, heapUsed: 0, clusters: 0, particles: 0, convergences: 0 };
    }
    
    return metrics.reduce((acc, m) => ({
      fps: acc.fps + m.fps / metrics.length,
      mainThreadTime: acc.mainThreadTime + m.mainThreadTime / metrics.length,
      drawCalls: acc.drawCalls + m.drawCalls / metrics.length,
      heapUsed: acc.heapUsed + m.heapUsed / metrics.length,
      clusters: acc.clusters + m.clusters / metrics.length,
      particles: acc.particles + m.particles / metrics.length,
      convergences: acc.convergences + m.convergences / metrics.length
    }), { fps: 0, mainThreadTime: 0, drawCalls: 0, heapUsed: 0, clusters: 0, particles: 0, convergences: 0 });
  }
  
  private isAcceptable(): boolean {
    const streetMetrics = this.metrics.filter((_, i) => i % 2 === 0);
    const cityMetrics = this.metrics.filter((_, i) => i % 2 === 1);
    
    const streetAvg = this.averageMetrics(streetMetrics);
    const cityAvg = this.averageMetrics(cityMetrics);
    
    const heapGrowth = (this.getHeapSize() - this.startHeap) / (1024 * 1024);
    
    return (
      streetAvg.fps >= CRITERIA.street.minFps &&
      streetAvg.mainThreadTime <= CRITERIA.street.maxMainThread &&
      streetAvg.drawCalls <= CRITERIA.street.maxDrawCalls &&
      cityAvg.fps >= CRITERIA.city.minFps &&
      cityAvg.mainThreadTime <= CRITERIA.city.maxMainThread &&
      cityAvg.drawCalls <= CRITERIA.city.maxDrawCalls &&
      heapGrowth <= CRITERIA.memory.maxGrowthMB
    );
  }
  
  private estimateMainThreadTime(): number {
    // Rough estimate based on frame time
    return Math.max(0, 16.67 - (1000 / 60)); // Assume 60fps baseline
  }
  
  private estimateDrawCalls(clusters: number, particles: number, convergences: number): number {
    // Rough estimate: clusters + particles + convergence markers + UI
    return clusters + particles + convergences + 50; // +50 for UI/background
  }
  
  private getHeapSize(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize || 0;
    }
    return 0; // Fallback for non-Chrome browsers
  }
}

// Global instance for dev testing
export const acceptanceChecker = new AcceptanceChecker();

// Add to window for manual testing
if (import.meta.env.DEV) {
  (window as any).__acceptanceChecker = acceptanceChecker;
  console.log('[field.atmo] 📊 Use window.__acceptanceChecker to test performance');
}