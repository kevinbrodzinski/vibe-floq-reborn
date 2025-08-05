import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, waitFor } from '@testing-library/react';
import { FieldCanvas } from '../FieldCanvas';

// Mock PIXI Application and its init method
const mockPixiApp = {
  init: vi.fn().mockResolvedValue(undefined),
  stage: {
    removeAllListeners: vi.fn(),
    removeChildren: vi.fn(),
    eventMode: 'auto',
    interactive: true
  },
  ticker: { stop: vi.fn() },
  destroy: vi.fn(),
  renderer: { gl: { isContextLost: () => false } }
};

// Mock PIXI Application constructor
vi.mock('pixi.js', () => ({
  Application: vi.fn(() => mockPixiApp),
  Container: vi.fn(() => ({
    addChild: vi.fn(),
    removeChild: vi.fn()
  })),
  Graphics: vi.fn(() => ({
    clear: vi.fn(),
    beginFill: vi.fn(),
    drawCircle: vi.fn(),
    endFill: vi.fn(),
    lineStyle: vi.fn(),
    position: { set: vi.fn() },
    visible: true
  })),
  Sprite: vi.fn(),
  Texture: vi.fn(),
  Text: vi.fn()
}));

// Mock all the dependencies
vi.mock('@/lib/pixi/PixiLifecycleManager', () => ({
  PixiLifecycleManager: {
    getInstance: () => ({
      registerApp: vi.fn(),
      destroyApp: vi.fn(),
      isDestroyed: vi.fn(() => false)
    })
  }
}));

vi.mock('@/hooks/useSpatialIndex', () => ({
  useSpatialIndex: () => ({ searchViewport: vi.fn() })
}));

vi.mock('@/hooks/useFieldHitTest', () => ({
  useFieldHitTest: () => vi.fn().mockResolvedValue([])
}));

vi.mock('@/hooks/useAddRipple', () => ({
  useAddRipple: () => vi.fn()
}));

vi.mock('@/hooks/location/useUnifiedLocation', () => ({
  useUnifiedLocation: () => ({ coords: null })
}));

vi.mock('@/hooks/useAdvancedHaptics', () => ({
  useAdvancedHaptics: () => ({ light: vi.fn(), medium: vi.fn() })
}));

// Mock other dependencies
vi.mock('@/utils/graphicsPool', () => ({
  GraphicsPool: vi.fn(() => ({ preAllocate: vi.fn() }))
}));

vi.mock('@/utils/tileSpritePool', () => ({
  TileSpritePool: vi.fn(() => ({ preAllocate: vi.fn() }))
}));

vi.mock('@/lib/pixi/SpritePool', () => ({
  SpritePool: vi.fn(() => ({ preAllocate: vi.fn() }))
}));

vi.mock('@/lib/geo/project', () => ({
  projectToScreen: vi.fn(),
  getMapInstance: vi.fn(() => ({
    getZoom: () => 11,
    on: vi.fn(),
    off: vi.fn()
  })),
  metersToPixelsAtLat: vi.fn(() => 10)
}));

vi.mock('@/lib/geo', () => ({
  geohashToCenter: vi.fn(() => [0, 0]),
  crowdCountToRadius: vi.fn(() => 5)
}));

vi.mock('@/lib/clusterWorker', () => ({
  clusterWorker: {
    cluster: vi.fn().mockResolvedValue([])
  }
}));

vi.mock('@/utils/timing', () => ({
  throttle: (fn: any) => Object.assign(fn, { clear: vi.fn() })
}));

describe('FieldCanvas', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render canvas container', () => {
    const { container } = render(<FieldCanvas people={[]} />);
    
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('should initialize PIXI app on mount', async () => {
    render(<FieldCanvas people={[]} />);
    
    await waitFor(() => {
      expect(mockPixiApp.init).toHaveBeenCalledWith({
        canvas: expect.any(HTMLCanvasElement),
        width: expect.any(Number),
        height: expect.any(Number),
        backgroundColor: undefined,
        antialias: true,
        resolution: expect.any(Number),
        autoDensity: true,
        backgroundAlpha: 0
      });
    });
  });

  it('should handle PIXI initialization errors gracefully', async () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    mockPixiApp.init.mockRejectedValueOnce(new Error('PIXI init failed'));
    
    render(<FieldCanvas people={[]} />);
    
    await waitFor(() => {
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        '[FieldCanvas] PIXI init failed:',
        expect.any(Error)
      );
    });
    
    consoleErrorSpy.mockRestore();
  });

  it('should cleanup PIXI app on unmount', async () => {
    const { unmount } = render(<FieldCanvas people={[]} />);
    
    // Wait for initialization
    await waitFor(() => {
      expect(mockPixiApp.init).toHaveBeenCalled();
    });
    
    const { PixiLifecycleManager } = await import('@/lib/pixi/PixiLifecycleManager');
    const mockManager = PixiLifecycleManager.getInstance();
    
    unmount();
    
    expect(mockManager.destroyApp).toHaveBeenCalled();
  });

  it('should handle fast unmount during initialization', async () => {
    const { unmount } = render(<FieldCanvas people={[]} />);
    
    // Unmount immediately before init completes
    unmount();
    
    const { PixiLifecycleManager } = await import('@/lib/pixi/PixiLifecycleManager');
    const mockManager = PixiLifecycleManager.getInstance();
    
    // Should still call destroyApp even if init didn't complete
    expect(mockManager.destroyApp).toHaveBeenCalled();
  });

  it('should set correct canvas attributes', () => {
    const { container } = render(<FieldCanvas people={[]} />);
    
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
    expect(canvas).toHaveClass('absolute', 'inset-0');
  });

  it('should use device pixel ratio for resolution', () => {
    // Mock device pixel ratio
    Object.defineProperty(window, 'devicePixelRatio', {
      value: 2,
      writable: true
    });
    
    render(<FieldCanvas people={[]} />);
    
    expect(mockPixiApp.init).toHaveBeenCalledWith(
      expect.objectContaining({
        resolution: 2
      })
    );
  });
});