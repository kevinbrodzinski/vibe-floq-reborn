export const formatTimeFromNow = (timestamp: string) => {
  const now = new Date();
  const time = new Date(timestamp);
  const diffInMinutes = Math.floor((time.getTime() - now.getTime()) / (1000 * 60));
  
  if (diffInMinutes < 0) {
    return `Started ${Math.abs(diffInMinutes)}m ago`;
  } else if (diffInMinutes < 60) {
    return `Starts in ${diffInMinutes}m`;
  } else {
    const hours = Math.floor(diffInMinutes / 60);
    return `Starts in ${hours}h`;
  }
};