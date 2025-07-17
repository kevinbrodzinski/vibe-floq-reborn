// utils/parseLocalTime.ts
export function to24h(time12h: string) {
  // "6:00 PM" → "18:00"
  const [time, modifier] = time12h.trim().split(' ');
  let   [hours, mins]    = time.split(':').map(Number);

  if (modifier?.toLowerCase() === 'pm' && hours < 12) hours += 12;
  if (modifier?.toLowerCase() === 'am' && hours === 12) hours  = 0;

  return `${hours.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}