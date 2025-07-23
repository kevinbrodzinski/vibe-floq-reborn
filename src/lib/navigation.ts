// Navigation helper for cross-platform compatibility
export const navigation = {
  navigate: (path: string) => {
    if (typeof window !== 'undefined') {
      // Web implementation
      window.location.href = path;
    } else {
      // Mobile implementation - return resolved promise to avoid unhandled rejections
      return Promise.resolve();
    }
  },
  
  replace: (path: string) => {
    if (typeof window !== 'undefined') {
      // Web implementation
      window.location.replace(path);
    } else {
      // Mobile implementation - return resolved promise
      return Promise.resolve();
    }
  },

  back: () => {
    if (typeof window !== 'undefined') {
      // Web implementation
      window.history.back();
    } else {
      // Mobile implementation - return resolved promise
      return Promise.resolve();
    }
  }
};