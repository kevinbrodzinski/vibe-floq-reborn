export type TOD = 'morning' | 'afternoon' | 'evening' | 'late';

export function useTimeGreeting(now = new Date()): { tod: TOD; tagline: string } {
  const h = now.getHours();
  const tod: TOD = h < 12 ? 'morning' : h < 18 ? 'afternoon' : h < 22 ? 'evening' : 'late';
  const tagline =
    tod === 'morning' ? 'Start your day with purpose' :
    tod === 'evening' ? 'Tonight starts now' :
    tod === 'late' ? 'Late night magic' :
    'Your afternoon awaits';
  return { tod, tagline };
}
