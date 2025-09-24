// Enhanced field tiles physics system
export { VelocityComputer } from './VelocityComputer';
export { SocialPhysicsCalculator } from './SocialPhysicsCalculator';
export { AfterglowTrailManager } from './AfterglowTrailManager';

// Utility functions for temporal data processing
export class TemporalBuffer<T> {
  private buffer: T[] = [];
  private maxSize: number;
  
  constructor(maxSize: number = 10) {
    this.maxSize = maxSize;
  }
  
  push(item: T): void {
    this.buffer.push(item);
    if (this.buffer.length > this.maxSize) {
      this.buffer.shift();
    }
  }
  
  get(index: number): T | undefined {
    return this.buffer[index];
  }
  
  getLast(n: number = 1): T[] {
    return this.buffer.slice(-n);
  }
  
  getAll(): T[] {
    return [...this.buffer];
  }
  
  get length(): number {
    return this.buffer.length;
  }
  
  clear(): void {
    this.buffer.length = 0;
  }
}