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
      // Force release if already tracked (dev hot-reload edge case)
      if (this.activeContainers.has(container)) {
        console.warn('[MapContainerManager] Force releasing container for re-use');
        this.activeContainers.delete(container);
      }

      // Clear any existing content
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }

      // Clear any mapbox-specific classes or attributes
      container.className = container.className
        .split(' ')
        .filter(cls => !cls.startsWith('mapbox'))
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
      this.activeContainers.delete(container);
      
      // Clear any remaining content
      while (container.firstChild) {
        container.removeChild(container.firstChild);
      }

      console.log('[MapContainerManager] Container released');
    } catch (error) {
      console.error('[MapContainerManager] Failed to release container:', error);
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