// Time formatting utilities for displaying relative times

export const formatStartedAgo = (startsAt?: string): string => {
  if (!startsAt) return 'just started';
  
  const startTime = new Date(startsAt);
  const now = new Date();
  const diffMs = now.getTime() - startTime.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  
  if (diffMinutes < 1) return 'just started';
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 48) return `${diffHours}h ago`;
  
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
};