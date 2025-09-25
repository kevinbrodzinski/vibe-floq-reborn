export const storage = {
  getItem: (k: string) => {
    try { return localStorage.getItem(k); } catch { return null; }
  },
  setItem: (k: string, v: string) => {
    try { localStorage.setItem(k, v); } catch {}
  },
  removeItem: (k: string) => {
    try { localStorage.removeItem(k); } catch {}
  }
};