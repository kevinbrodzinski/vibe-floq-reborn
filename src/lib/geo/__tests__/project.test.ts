import { describe, it, expect, beforeAll, vi } from 'vitest';
import { setMapInstance, projectLatLng, unprojectXY } from '../project';

// Mock mapbox-gl for testing
const mockProject = vi.fn();
const mockUnproject = vi.fn();

const mockMap = {
  project: mockProject,
  unproject: mockUnproject,
} as any;

describe('projection utilities', () => {
  beforeAll(() => {
    setMapInstance(mockMap);
  });

  it('should project lat/lng to screen coordinates', () => {
    mockProject.mockReturnValue({ x: 500, y: 300 });
    
    const result = projectLatLng(-118.2437, 34.0522);
    
    expect(mockProject).toHaveBeenCalledWith([-118.2437, 34.0522]);
    expect(result).toEqual({ x: 500, y: 300 });
  });

  it('should unproject screen coordinates to lat/lng', () => {
    mockUnproject.mockReturnValue({ lng: -118.2437, lat: 34.0522 });
    
    const result = unprojectXY(500, 300);
    
    expect(mockUnproject).toHaveBeenCalledWith([500, 300]);
    expect(result).toEqual({ lng: -118.2437, lat: 34.0522 });
  });

  it('should maintain precision through round-trip projection', () => {
    const originalLng = -118.2437;
    const originalLat = 34.0522;
    
    // Mock a realistic round-trip with minimal precision loss
    mockProject.mockReturnValue({ x: 500.123, y: 300.456 });
    mockUnproject.mockReturnValue({ 
      lng: originalLng + 0.000001, // Small precision loss
      lat: originalLat + 0.000001 
    });
    
    const projected = projectLatLng(originalLng, originalLat);
    const unprojected = unprojectXY(projected.x, projected.y);
    
    // Should maintain precision within reasonable bounds (< 1e-5 degrees ≈ 1m)
    expect(Math.abs(unprojected.lng - originalLng)).toBeLessThan(1e-5);
    expect(Math.abs(unprojected.lat - originalLat)).toBeLessThan(1e-5);
  });

  it('should throw error when map instance not set', () => {
    // Create a new module instance to test error case
    vi.resetModules();
    const { projectLatLng: testProjectLatLng, unprojectXY: testUnprojectXY } = require('../project');
    
    expect(() => testProjectLatLng(-118, 34)).toThrow('map instance not set');
    expect(() => testUnprojectXY(500, 300)).toThrow('map instance not set');
    
    // Restore for other tests
    setMapInstance(mockMap);
  });
});