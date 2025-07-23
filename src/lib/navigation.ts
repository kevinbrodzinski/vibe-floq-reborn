// Navigation helper for cross-platform compatibility
export const navigation = {
  navigate: (path: string): void => {
    if (typeof window !== 'undefined') {
      window.location.href = path;
    }
  },
  
  replace: (path: string): void => {
    if (typeof window !== 'undefined') {
      window.location.replace(path);
    }
  },

  back: (): void => {
    if (typeof window !== 'undefined') {
      window.history.back();
    }
  }
};