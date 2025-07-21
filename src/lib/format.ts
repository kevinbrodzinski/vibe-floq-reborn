// Formatting utilities for currency, time, and other display values

export const formatCurrency = (amount: number | undefined | null): string => {
  // Return empty string for null to distinguish from explicit $0
  if (amount === undefined || amount === null) return '';
  
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

export const formatTime = (timeString: string | undefined | null, locale?: string): string => {
  if (!timeString) return '';
  
  try {
    // Handle time in HH:MM format
    if (timeString.includes(':') && !timeString.includes('T')) {
      const [hours, minutes] = timeString.split(':');
      // Use fixed date to avoid timezone issues
      const date = new Date('2000-01-01T00:00:00.000Z');
      date.setUTCHours(parseInt(hours), parseInt(minutes), 0, 0); // Reset seconds/ms
      return date.toLocaleTimeString(locale || 'en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true,
        timeZone: 'UTC'
      });
    }
    
    // Handle ISO timestamp
    const date = new Date(timeString);
    if (isNaN(date.getTime())) return timeString;
    
    return date.toLocaleTimeString('en-US', { 
      hour: 'numeric', 
      minute: '2-digit',
      hour12: true 
    });
  } catch {
    return timeString;
  }
};

export const formatTimeRange = (startTime: string | undefined | null, endTime: string | undefined | null): string | undefined => {
  const formattedStart = formatTime(startTime);
  const formattedEnd = formatTime(endTime);
  
  if (!formattedStart && !formattedEnd) return undefined;
  if (!formattedStart) return formattedEnd;
  if (!formattedEnd) return formattedStart;
  
  return `${formattedStart} - ${formattedEnd}`;
};

export const formatDuration = (minutes: number | undefined | null): string => {
  if (!minutes || minutes <= 0) return '';
  
  if (minutes < 60) {
    return `${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  
  if (remainingMinutes === 0) {
    return `${hours}h`;
  }
  
  return `${hours}h ${remainingMinutes}m`;
};

export const formatParticipantCount = (count: number, max?: number): string => {
  if (max) {
    return `${count}/${max}`;
  }
  return `${count}`;
};