import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { EnvironmentalCollector } from '../EnvironmentalCollector';

describe('EnvironmentalCollector', () => {
  let collector: EnvironmentalCollector;

  beforeEach(() => {
    collector = new EnvironmentalCollector();
  });

  afterEach(() => {
    collector.dispose();
  });

  it('has correct name and implements interface', () => {
    expect(collector.name).toBe('environmental');
    expect(typeof collector.isAvailable).toBe('function');
    expect(typeof collector.collect).toBe('function');
    expect(typeof collector.getQuality).toBe('function');
    expect(typeof collector.dispose).toBe('function');
  });

  it('returns null when unavailable', async () => {
    // Mock environment to be unsupported
    Object.defineProperty(navigator, 'mediaDevices', {
      value: undefined,
      writable: true
    });
    
    const signal = await collector.collect();
    expect(signal).toBeNull();
  });

  it('has bounded quality score', () => {
    const quality = collector.getQuality();
    expect(quality).toBeGreaterThanOrEqual(0);
    expect(quality).toBeLessThanOrEqual(1);
  });

  it('properly disposes resources', () => {
    expect(() => collector.dispose()).not.toThrow();
  });

  it('handles permission requests gracefully', async () => {
    const result = await collector.initPermissions(false, false);
    expect(typeof result).toBe('object');
  });

  it('stops sampling when stopped', () => {
    collector.stop();
    expect(() => collector.stop()).not.toThrow(); // idempotent
  });
});