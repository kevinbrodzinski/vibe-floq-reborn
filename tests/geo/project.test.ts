import { setMapInstance, projectLatLng, unprojectXY } from '@/lib/geo/project';
import { vi, expect, it, describe } from 'vitest';

const mockMap = { 
  project: vi.fn(() => ({ x: 100, y: 200 })), 
  unproject: vi.fn(() => ({ lng: -118, lat: 34 })) 
} as any;

describe('projection utils', () => {
  setMapInstance(mockMap as any);

  it('projects coordinates from lat/lng to screen x/y', () => {
    expect(projectLatLng(-118, 34)).toEqual({ x: 100, y: 200 });
    expect(mockMap.project).toHaveBeenCalledWith([-118, 34]);
  });

  it('unprojects coordinates from screen x/y to lat/lng', () => {
    expect(unprojectXY(100, 200)).toEqual({ lng: -118, lat: 34 });
    expect(mockMap.unproject).toHaveBeenCalledWith([100, 200]);
  });

  it('throws error when map instance not set', () => {
    vi.resetAllMocks();
    setMapInstance(null);
    expect(() => projectLatLng(-118, 34)).toThrow('Map instance not set');
    expect(() => unprojectXY(100, 200)).toThrow('Map instance not set');
  });

  afterEach(() => {
    setMapInstance(null);
    vi.resetAllMocks();
  });
});