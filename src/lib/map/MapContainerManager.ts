/**
 * MapContainerManager - Ensures clean map container initialization
 * Prevents Mapbox "container should be empty" errors
 */

export class MapContainerManager {
  private static instance: MapContainerManager | null = null;
  private activeContainers = new Set<HTMLElement>();

  static getInstance(): MapContainerManager {
    if (!this.instance) {
      this.instance = new MapContainerManager();
    }
    return this.instance;
  }

  /**
   * Prepares a container for Mapbox initialization
   * Ensures it's completely empty and ready
   */
  prepareContainer(container: HTMLElement): boolean {
    try {
      // Check if container is already in use - this is normal in dev mode
      if (this.activeContainers.has(container)) {
        // Only warn if this happens frequently (potential issue)
        const now = Date.now();
        const lastWarn = (container as any).__lastContainerWarn || 0;
        if (now - lastWarn > 1000) { // Throttle warnings to once per second
          console.warn('[MapContainerManager] Container reuse detected - this may indicate frequent re-renders');
          (container as any).__lastContainerWarn = now;
        }
        this.activeContainers.delete(container);
      }

      // Clear any existing content
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }

      // Clear mapbox-specific classes only, preserve Tailwind sizing
      container.className = container.className
        .split(' ')
        .filter(cls => !cls.startsWith('mapbox') && !cls.includes('mapbox'))
        .join(' ');

      // Remove mapbox-specific attributes
      const mapboxAttrs = ['data-mapbox', 'data-mapbox-style', 'data-mapbox-token'];
      mapboxAttrs.forEach(attr => container.removeAttribute(attr));

      // Mark as active
      this.activeContainers.add(container);
      
      console.log('[MapContainerManager] Container prepared successfully');
      return true;
    } catch (error) {
      console.error('[MapContainerManager] Failed to prepare container:', error);
      return false;
    }
  }

  /**
   * Releases a container after map destruction
   */
  releaseContainer(container: HTMLElement): void {
    try {
      // Always delete from active containers set
      this.activeContainers.delete(container);
      
      // Clear any remaining content
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }

      console.log('[MapContainerManager] Container released');
    } catch (error) {
      console.error('[MapContainerManager] Failed to release container:', error);
      // Force delete even on error to prevent memory leaks
      this.activeContainers.delete(container);
    }
  }

  /**
   * Check if container is ready for Mapbox
   */
  isContainerReady(container: HTMLElement): boolean {
    return container.children.length === 0 && 
           !this.activeContainers.has(container);
  }
}