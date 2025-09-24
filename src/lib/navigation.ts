/* ------------------------------------------------------------------
   Minimal cross-platform navigation helper (web first)
------------------------------------------------------------------ */

export const navigation = {
  navigate(path: string): void {
    if (typeof window !== 'undefined') window.location.href = path;
  },

  replace(path: string): void {
    if (typeof window !== 'undefined') window.location.replace(path);
  },

  back(): void {
    if (typeof window !== 'undefined') {
      if (window.history.length > 1) window.history.back();
      else window.location.replace('/');
    }
  }
};