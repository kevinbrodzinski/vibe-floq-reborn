// Navigation helper for cross-platform compatibility
export const navigation = {
  navigate: (path: string) => {
    if (typeof window !== 'undefined') {
      // Web implementation
      window.location.href = path;
    } else {
      // TODO: Add React Navigation support for native
      console.warn('Navigation not implemented for native platform');
    }
  },
  
  replace: (path: string) => {
    if (typeof window !== 'undefined') {
      // Web implementation
      window.location.replace(path);
    } else {
      // TODO: Add React Navigation support for native
      console.warn('Navigation not implemented for native platform');
    }
  }
};