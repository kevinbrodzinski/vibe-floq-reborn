import { rippleQueue } from '@/lib/rippleQueue';

export const useAddRipple = () => {
  return (x: number, y: number) => {
    rippleQueue.push({ x, y, t: performance.now() });
  };
};