// utils/timeWindow.ts
export type PulseTimeWindow = {
  start: Date;
  end: Date;
  label: string;
};

export function getPulseWindow(label: 'now'|'tonight'|'tomorrow'|'weekend', now = new Date()): PulseTimeWindow {
  const d = new Date(now);
  const hour = d.getHours();
  const isNight = hour >= 19 || hour < 2; // 7pm-2am
  
  if (label === 'now') {
    const start = new Date(d);
    const end = new Date(d.getTime() + 2*60*60*1000); // next 2 hours
    return { start, end, label: 'Now' };
  }
  
  if (label === 'tonight') {
    const start = new Date(d);
    start.setHours(19, 0, 0, 0); // 7 PM today
    const end = new Date(start);
    end.setHours(23, 59, 0, 0); // 11:59 PM today
    
    // If it's already night (7pm-2am), "tonight" means tomorrow night
    if (isNight) {
      start.setDate(start.getDate() + 1);
      end.setDate(end.getDate() + 1);
    }
    
    return { start, end, label: 'Tonight' };
  }
  
  if (label === 'tomorrow') {
    const start = new Date(d);
    start.setDate(d.getDate() + 1);
    start.setHours(19, 0, 0, 0); // 7 PM tomorrow
    const end = new Date(start);
    end.setHours(23, 59, 0, 0); // 11:59 PM tomorrow
    
    return { start, end, label: 'Tomorrow' };
  }
  
  if (label === 'weekend') {
    // Next Friday 5pm → Sunday 11:59pm
    const next = new Date(d);
    const day = next.getDay(); // 0=Sunday, 1=Monday, ..., 6=Saturday
    const toFri = (5 - day + 7) % 7; // Days until Friday
    
    const start = new Date(next);
    start.setDate(next.getDate() + toFri);
    start.setHours(17, 0, 0, 0); // Friday 5 PM
    
    const end = new Date(start);
    end.setDate(start.getDate() + 2); // Sunday
    end.setHours(23, 59, 0, 0); // Sunday 11:59 PM
    
    return { start, end, label: 'Weekend' };
  }
  
  // Fallback
  return { start: d, end: d, label: 'Now' };
}

export function getDynamicTimeLabel(now = new Date()): 'tonight' | 'tomorrow' {
  const hour = now.getHours();
  const isNight = hour >= 19 || hour < 2; // 7pm-2am
  
  // If it's night time, show "Tomorrow", otherwise show "Tonight"
  return isNight ? 'tomorrow' : 'tonight';
}

export function formatTimeWindow(window: PulseTimeWindow): string {
  const { start, end } = window;
  const startTime = start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  const endTime = end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  
  if (start.toDateString() === end.toDateString()) {
    return `${startTime} - ${endTime}`;
  } else {
    return `${start.toLocaleDateString()} ${startTime} - ${end.toLocaleDateString()} ${endTime}`;
  }
}