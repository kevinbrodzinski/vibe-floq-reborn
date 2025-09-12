export function hashJSON(obj: unknown): string {
  // FNV-1a 32-bit
  const s = typeof obj === 'string' ? obj : JSON.stringify(obj);
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(16);
}