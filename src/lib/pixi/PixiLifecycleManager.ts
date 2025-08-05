import type { Application } from 'pixi.js';

/**
 * PixiLifecycleManager - Safe PIXI application lifecycle management
 * Prevents ticker.stop() errors and ensures clean destruction
 */

export class PixiLifecycleManager {
  private static instance: PixiLifecycleManager | null = null;
  private activeApps = new Map<Application, boolean>();

  constructor() {
    // Clean up on page unload
    if (typeof window !== 'undefined') {
      window.addEventListener('beforeunload', () => this.destroyAll());
    }
  }

  static getInstance(): PixiLifecycleManager {
    if (!this.instance) {
      this.instance = new PixiLifecycleManager();
    }
    return this.instance;
  }

  /**
   * Registers a PIXI app for lifecycle management
   */
  registerApp(app: Application): void {
    this.activeApps.set(app, false); // false = not destroyed
    console.log('[PixiLifecycleManager] App registered');
  }

  /**
   * Safely destroys a PIXI application with proper cleanup order
   */
  destroyApp(app: Application | null): void {
    if (!app) {
      console.log('[PixiLifecycleManager] No app to destroy');
      return;
    }

    // Check if already destroyed
    if (this.activeApps.get(app) === true || (app as any)._destroyed) {
      console.log('[PixiLifecycleManager] App already destroyed');
      return;
    }

    console.log('[PixiLifecycleManager] Starting safe destroy sequence');

    try {
      // Step 1: Remove all event listeners first
      if (app.stage) {
        app.stage.removeAllListeners();
        app.stage.eventMode = 'none';
        app.stage.interactive = false;
      }

      // Step 2: Stop ticker safely (with null check)
      if (app.ticker && typeof app.ticker.stop === 'function') {
        try {
          app.ticker.stop();
          console.log('[PixiLifecycleManager] Ticker stopped');
        } catch (tickerError) {
          console.warn('[PixiLifecycleManager] Ticker stop error (non-critical):', tickerError);
        }
      }

      // Step 3: Clear stage children
      if (app.stage && app.stage.children) {
        app.stage.removeChildren();
      }

      // Step 4: Destroy the application
      app.destroy(true, { 
        children: true, 
        texture: true
      });

      // Step 5: Clean up from tracking
      this.activeApps.delete(app);
      console.log('[PixiLifecycleManager] App destroyed successfully');

    } catch (error) {
      console.warn('[PixiLifecycleManager] Destroy error (handled):', error);
      // Still clean up tracking to prevent memory leaks
      this.activeApps.delete(app);
    }
  }

  /**
   * Check if app is safely destroyed
   */
  isDestroyed(app: Application): boolean {
    return !this.activeApps.has(app) || (app as any)._destroyed;
  }

  /**
   * Emergency cleanup - destroys all registered apps
   */
  destroyAll(): void {
    console.log('[PixiLifecycleManager] Emergency cleanup of all apps');
    for (const [app, destroyed] of this.activeApps) {
      if (!destroyed) {
        this.destroyApp(app);
      }
    }
    this.activeApps.clear();
  }
}