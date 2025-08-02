import { useTimeWarp } from '@/lib/timeWarp';
export const TimeScrubber = () => {
  const {
    t,
    set
  } = useTimeWarp();
  const hoursAgo = t ? Math.round((Date.now() - t.getTime()) / 3.6e6) : 0;
  return null;
};