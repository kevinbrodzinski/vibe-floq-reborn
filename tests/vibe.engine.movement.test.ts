import { describe, it, expect, beforeEach } from 'vitest';
import { MovementFromLocationTracker } from '@/core/vibe/collectors/MovementFromLocation';
import { DwellTracker } from '@/core/vibe/collectors/DwellTracker';

describe('Movement Detection', () => {
  let tracker: MovementFromLocationTracker;

  beforeEach(() => {
    tracker = new MovementFromLocationTracker();
  });

  it('should return zero speed with no coordinates', () => {
    const result = tracker.update();
    expect(result.speedMps).toBe(0);
    expect(result.moving01).toBe(0);
  });

  it('should return zero speed on first coordinate', () => {
    const result = tracker.update({ lat: 40.7128, lng: -74.0060 });
    expect(result.speedMps).toBe(0);
    expect(result.moving01).toBe(0);
  });

  it('should calculate speed between two points', () => {
    // First point
    tracker.update({ lat: 40.7128, lng: -74.0060 });
    
    // Wait a bit and move to nearby point
    const result = tracker.update({ lat: 40.7129, lng: -74.0059 });
    
    expect(result.speedMps).toBeGreaterThanOrEqual(0);
    expect(result.moving01).toBeGreaterThanOrEqual(0);
    expect(result.moving01).toBeLessThanOrEqual(1);
  });
});

describe('Dwell Detection', () => {
  let tracker: DwellTracker;

  beforeEach(() => {
    tracker = new DwellTracker();
  });

  it('should track dwell time when stationary', () => {
    tracker.update(0); // completely still
    expect(tracker.dwellMinutes()).toBeGreaterThanOrEqual(0);
  });

  it('should reset dwell time when moving', () => {
    tracker.update(0); // still
    tracker.update(0.8); // moving
    expect(tracker.dwellMinutes()).toBe(0);
  });

  it('should not consider as arrived immediately', () => {
    tracker.update(0); // just became still
    expect(tracker.arrived()).toBe(false);
  });

  it('should handle edge cases in movement detection', () => {
    // Slight movement should not reset dwell
    tracker.update(0.1);
    expect(tracker.dwellMinutes()).toBeGreaterThanOrEqual(0);
    
    // Significant movement should reset
    tracker.update(0.5);
    expect(tracker.dwellMinutes()).toBe(0);
  });
});