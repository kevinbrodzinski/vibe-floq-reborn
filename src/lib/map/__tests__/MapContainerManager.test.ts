import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MapContainerManager } from '../MapContainerManager';

describe('MapContainerManager', () => {
  let manager: MapContainerManager;
  let container: HTMLElement;

  beforeEach(() => {
    manager = MapContainerManager.getInstance();
    container = document.createElement('div');
    container.className = 'w-full h-full mapbox-existing-class';
    container.setAttribute('data-mapbox', 'test');
    
    // Add some child elements to test cleanup
    const child = document.createElement('span');
    child.textContent = 'test content';
    container.appendChild(child);
  });

  it('should be a singleton', () => {
    const instance1 = MapContainerManager.getInstance();
    const instance2 = MapContainerManager.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should prepare container successfully on first use', () => {
    const result = manager.prepareContainer(container);
    expect(result).toBe(true);
    expect(container.children.length).toBe(0);
    expect(container.className).toBe('w-full h-full');
    expect(container.hasAttribute('data-mapbox')).toBe(false);
  });

  it('should reject reused containers', () => {
    // First prepare should succeed
    expect(manager.prepareContainer(container)).toBe(true);
    expect(manager.isContainerReady(container)).toBe(false);
    
    // Second prepare should warn and force release
    const consoleWarnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
    expect(manager.prepareContainer(container)).toBe(true);
    expect(consoleWarnSpy).toHaveBeenCalledWith('[MapContainerManager] Force releasing container for re-use');
    
    consoleWarnSpy.mockRestore();
  });

  it('should release container and clean up tracking', () => {
    manager.prepareContainer(container);
    expect(manager.isContainerReady(container)).toBe(false);
    
    manager.releaseContainer(container);
    expect(manager.isContainerReady(container)).toBe(true);
    expect(container.children.length).toBe(0);
  });

  it('should handle container preparation errors gracefully', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock removeChild to throw an error
    const originalRemoveChild = container.removeChild;
    container.removeChild = vi.fn(() => {
      throw new Error('DOM manipulation failed');
    });
    
    const result = manager.prepareContainer(container);
    expect(result).toBe(false);
    expect(consoleErrorSpy).toHaveBeenCalled();
    
    // Restore
    container.removeChild = originalRemoveChild;
    consoleErrorSpy.mockRestore();
  });

  it('should handle container release errors gracefully', () => {
    manager.prepareContainer(container);
    
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    
    // Mock removeChild to throw an error
    container.removeChild = vi.fn(() => {
      throw new Error('DOM manipulation failed');
    });
    
    manager.releaseContainer(container);
    expect(consoleErrorSpy).toHaveBeenCalled();
    expect(manager.isContainerReady(container)).toBe(true); // Should still mark as released
    
    consoleErrorSpy.mockRestore();
  });

  it('should identify ready containers correctly', () => {
    // Fresh container should be ready
    const freshContainer = document.createElement('div');
    expect(manager.isContainerReady(freshContainer)).toBe(true);
    
    // Prepared container should not be ready
    manager.prepareContainer(container);
    expect(manager.isContainerReady(container)).toBe(false);
    
    // Released container should be ready again
    manager.releaseContainer(container);
    expect(manager.isContainerReady(container)).toBe(true);
  });

  it('should preserve non-mapbox CSS classes', () => {
    container.className = 'w-full h-full custom-class mapbox-style-class other-mapbox';
    
    manager.prepareContainer(container);
    
    expect(container.className).toBe('w-full h-full custom-class');
  });

  it('should remove all mapbox-specific attributes', () => {
    container.setAttribute('data-mapbox-style', 'test-style');
    container.setAttribute('data-mapbox-token', 'test-token');
    container.setAttribute('data-custom', 'keep-me');
    
    manager.prepareContainer(container);
    
    expect(container.hasAttribute('data-mapbox')).toBe(false);
    expect(container.hasAttribute('data-mapbox-style')).toBe(false);
    expect(container.hasAttribute('data-mapbox-token')).toBe(false);
    expect(container.hasAttribute('data-custom')).toBe(true);
  });
});