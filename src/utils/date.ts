
export function getTodayString(): string {
  return new Date().toISOString().split('T')[0];
}

export function formatDateString(date: string): string {
  return new Date(date).toLocaleDateString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

export function isToday(date: string): boolean {
  return date === getTodayString();
}

export function getDateDaysAgo(days: number): string {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split('T')[0];
}
