import { describe, it, expect, beforeEach } from 'vitest';
import { TimeCrystal } from '@/lib/pixi/systems/TimeCrystal';
import * as PIXI from 'pixi.js';

describe('TimeCrystal Lifecycle', () => {
  let timeCrystal: TimeCrystal;
  let mockStage: PIXI.Container;
  let mockMap: any;

  beforeEach(() => {
    timeCrystal = new TimeCrystal();
    mockStage = new PIXI.Container();
    mockMap = {
      getLayer: () => null,
      addLayer: () => {},
      removeLayer: () => {},
    };
  });

  it('queues messages before onAdd and replays after', () => {
    // Should not throw when sending message before onAdd
    expect(() => {
      timeCrystal.onMessage('temporal', { now: [] });
    }).not.toThrow();

    // Attach should not throw and should process queued messages
    expect(() => {
      timeCrystal.onAdd(mockStage, mockMap);
    }).not.toThrow();

    // Should not throw when sending message after onAdd
    expect(() => {
      timeCrystal.onMessage('temporal', { now: [] });
    }).not.toThrow();
  });

  it('handles onFrame gracefully before onAdd', () => {
    const mockProject = (lng: number, lat: number) => ({ x: lng, y: lat });
    
    // Should not throw when onFrame called before onAdd
    expect(() => {
      timeCrystal.onFrame(16.67, mockProject, 10);
    }).not.toThrow();
  });

  it('cleans up properly on onRemove', () => {
    timeCrystal.onAdd(mockStage, mockMap);
    
    expect(() => {
      timeCrystal.onRemove();
    }).not.toThrow();
  });

  it('is idempotent for multiple onAdd calls', () => {
    timeCrystal.onAdd(mockStage, mockMap);
    
    // Second call should not throw
    expect(() => {
      timeCrystal.onAdd(mockStage, mockMap);
    }).not.toThrow();
  });
});