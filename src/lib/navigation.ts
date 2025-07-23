// Navigation helper for cross-platform compatibility
export const navigation = {
  navigate: (path: string): void => {
    if (typeof window !== 'undefined') {
      // Web implementation
      window.location.href = path;
    }
    // Mobile implementation - no-op for now
  },
  
  replace: (path: string): void => {
    if (typeof window !== 'undefined') {
      // Web implementation
      window.location.replace(path);
    }
    // Mobile implementation - no-op for now
  },

  back: (): void => {
    if (typeof window !== 'undefined') {
      // Web implementation
      window.history.back();
    }
    // Mobile implementation - no-op for now
  }
};