export const formatTimeLeft = (endsAt: string | undefined): string => {
  if (!endsAt) return 'Ongoing';
  
  const now = new Date();
  const end = new Date(endsAt);
  const diffMs = end.getTime() - now.getTime();
  
  if (diffMs <= 0) return 'Ended';
  
  const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
  const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
  
  if (diffHours > 0) {
    return `${diffHours}h ${diffMinutes}m`;
  } else if (diffMinutes > 0) {
    return `${diffMinutes}m`;
  } else {
    return 'Ending now';
  }
};