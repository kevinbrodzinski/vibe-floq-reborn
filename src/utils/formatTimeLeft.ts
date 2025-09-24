export const formatTimeLeft = (endsAt: string | undefined): string => {
  if (!endsAt) return 'Ongoing';
  
  const now = new Date();
  const end = new Date(endsAt);
  const diffMs = end.getTime() - now.getTime();
  
  // Safety clamp for negative drift (client clock skew)
  if (diffMs < -30000) return 'Ended'; // If more than 30s negative, consider it ended
  if (diffMs <= 0) return 'Ending now';
  
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