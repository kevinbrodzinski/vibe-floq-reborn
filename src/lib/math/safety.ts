// Math safety utilities for preventing NaN and extreme values
export const safe = (n: number, cap = 5): number => 
  Number.isFinite(n) ? Math.max(-cap, Math.min(cap, n)) : 0;

export const safeAngle = (angle: number): number => 
  Number.isFinite(angle) ? angle : 0;