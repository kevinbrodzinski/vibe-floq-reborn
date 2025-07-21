/**
 * Currency formatting utilities
 */
export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0
  }).format(amount);
};

/**
 * Time formatting utilities
 */
export const formatTime = (timeString: string): string => {
  if (!timeString || !/^[0-2]\d:\d\d/.test(timeString)) {
    return '--:--';
  }
  
  try {
    // Create a date object for formatting, using a fixed date to avoid timezone issues
    const [hours, minutes] = timeString.split(':');
    const date = new Date(2000, 0, 1, parseInt(hours), parseInt(minutes));
    
    return date.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  } catch {
    return '--:--';
  }
};