import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { PixiLifecycleManager } from '../PixiLifecycleManager';

// Mock PIXI Application
const mockApp = {
  renderer: {
    gl: {
      isContextLost: vi.fn(() => false)
    }
  },
  stage: {
    removeAllListeners: vi.fn(),
    removeChildren: vi.fn(),
    eventMode: 'auto',
    interactive: true,
    children: []
  },
  ticker: {
    stop: vi.fn()
  },
  destroy: vi.fn(),
  _destroyed: false
};

const createMockApp = (overrides: any = {}) => ({
  ...mockApp,
  ...overrides,
  stage: { ...mockApp.stage, ...(overrides.stage || {}) },
  renderer: { 
    gl: { 
      isContextLost: vi.fn(() => false),
      ...(overrides.renderer?.gl || {})
    },
    ...(overrides.renderer || {})
  },
  ticker: { ...mockApp.ticker, ...(overrides.ticker || {}) }
});

describe('PixiLifecycleManager', () => {
  let manager: PixiLifecycleManager;

  beforeEach(() => {
    manager = PixiLifecycleManager.getInstance();
    vi.clearAllMocks();
  });

  afterEach(() => {
    // Clean up any registered apps
    manager.destroyAll();
  });

  it('should be a singleton', () => {
    const instance1 = PixiLifecycleManager.getInstance();
    const instance2 = PixiLifecycleManager.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should register app for lifecycle management', () => {
    const app = createMockApp() as any;
    
    manager.registerApp(app);
    expect(manager.isDestroyed(app)).toBe(false);
  });

  it('should safely destroy app with proper cleanup sequence', () => {
    const app = createMockApp() as any;
    manager.registerApp(app);
    
    manager.destroyApp(app);
    
    // Verify cleanup sequence
    expect(app.stage.removeAllListeners).toHaveBeenCalled();
    expect(app.stage.eventMode).toBe('none');
    expect(app.stage.interactive).toBe(false);
    expect(app.ticker.stop).toHaveBeenCalled();
    expect(app.stage.removeChildren).toHaveBeenCalled();
    expect(app.destroy).toHaveBeenCalledWith(true, { children: true, texture: true });
    expect(manager.isDestroyed(app)).toBe(true);
  });

  it('should skip destroy if app is null or already destroyed', () => {
    const app = createMockApp() as any;
    manager.registerApp(app);
    manager.destroyApp(app); // First destroy
    
    const destroySpy = vi.spyOn(app, 'destroy');
    manager.destroyApp(app); // Second destroy should be skipped
    
    expect(destroySpy).not.toHaveBeenCalled();
  });

  it('should handle GL context already lost gracefully', () => {
    const app = createMockApp({
      renderer: { gl: { isContextLost: () => true } }
    }) as any;
    manager.registerApp(app);
    
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    manager.destroyApp(app);
    
    expect(consoleWarnSpy).toHaveBeenCalledWith('[PixiLifecycleManager] GL context already lost – skipping destroy');
    expect(app.destroy).not.toHaveBeenCalled();
    expect(manager.isDestroyed(app)).toBe(true);
    
    consoleWarnSpy.mockRestore();
  });

  it('should handle ticker stop errors gracefully', () => {
    const app = createMockApp({
      ticker: {
        stop: vi.fn(() => { throw new Error('Ticker stop failed'); })
      }
    }) as any;
    manager.registerApp(app);
    
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    manager.destroyApp(app);
    
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[PixiLifecycleManager] Ticker stop error (non-critical):',
      expect.any(Error)
    );
    expect(app.destroy).toHaveBeenCalled(); // Should still continue with destroy
    
    consoleWarnSpy.mockRestore();
  });

  it('should handle destroy errors gracefully', () => {
    const app = createMockApp({
      destroy: vi.fn(() => { throw new Error('Destroy failed'); })
    }) as any;
    manager.registerApp(app);
    
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    
    manager.destroyApp(app);
    
    expect(consoleWarnSpy).toHaveBeenCalledWith(
      '[PixiLifecycleManager] Destroy error (handled):',
      expect.any(Error)
    );
    expect(manager.isDestroyed(app)).toBe(true); // Should still mark as destroyed
    
    consoleWarnSpy.mockRestore();
  });

  it('should handle missing stage gracefully', () => {
    const app = createMockApp({ stage: null }) as any;
    manager.registerApp(app);
    
    expect(() => manager.destroyApp(app)).not.toThrow();
    expect(app.destroy).toHaveBeenCalled();
  });

  it('should handle missing ticker gracefully', () => {
    const app = createMockApp({ ticker: null }) as any;
    manager.registerApp(app);
    
    expect(() => manager.destroyApp(app)).not.toThrow();
    expect(app.destroy).toHaveBeenCalled();
  });

  it('should destroy all registered apps', () => {
    const app1 = createMockApp() as any;
    const app2 = createMockApp() as any;
    
    manager.registerApp(app1);
    manager.registerApp(app2);
    
    manager.destroyAll();
    
    expect(app1.destroy).toHaveBeenCalled();
    expect(app2.destroy).toHaveBeenCalled();
    expect(manager.isDestroyed(app1)).toBe(true);
    expect(manager.isDestroyed(app2)).toBe(true);
  });

  it('should detect destroyed apps correctly', () => {
    const app = createMockApp() as any;
    
    // Not registered yet
    expect(manager.isDestroyed(app)).toBe(true);
    
    // Registered but not destroyed
    manager.registerApp(app);
    expect(manager.isDestroyed(app)).toBe(false);
    
    // Destroyed
    manager.destroyApp(app);
    expect(manager.isDestroyed(app)).toBe(true);
    
    // App with _destroyed flag
    const destroyedApp = createMockApp({ _destroyed: true }) as any;
    manager.registerApp(destroyedApp);
    expect(manager.isDestroyed(destroyedApp)).toBe(true);
  });

  it('should handle GL context check errors', () => {
    const app = createMockApp({
      renderer: { gl: null }
    }) as any;
    manager.registerApp(app);
    
    expect(() => manager.destroyApp(app)).not.toThrow();
    // When GL context is null, destroy should be skipped for safety
    expect(app.destroy).not.toHaveBeenCalled();
    // But the app should still be removed from tracking
    expect(manager.isDestroyed(app)).toBe(true);
  });
});