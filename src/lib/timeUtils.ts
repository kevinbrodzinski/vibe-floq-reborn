export const formatTimeRange = (startTime: string, endTime: string) => {
  try {
    const formatTime = (time: string) => {
      const [hours, minutes] = time.split(':');
      const date = new Date();
      date.setHours(parseInt(hours), parseInt(minutes));
      return date.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
    };
    return `${formatTime(startTime)} - ${formatTime(endTime)}`;
  } catch {
    return `${startTime} - ${endTime}`;
  }
};

export const formatTime = (timeString: string) => {
  const date = new Date(timeString);
  return date.toLocaleTimeString('en-US', { 
    hour: 'numeric', 
    minute: '2-digit',
    hour12: true 
  });
};