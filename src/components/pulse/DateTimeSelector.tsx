import React from 'react';
import { Calendar, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export type TimeFilter = 'now' | 'tonight' | 'tomorrow' | 'weekend' | 'custom';

interface DateTimeSelectorProps {
  value: TimeFilter;
  onChange: (value: TimeFilter) => void;
  onCalendarClick?: () => void;
}

export const DateTimeSelector: React.FC<DateTimeSelectorProps> = ({
  value,
  onChange,
  onCalendarClick
}) => {
  // Dynamic label logic based on current time
  const getDynamicLabel = (): string => {
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
    
    // If it's after 5 PM, show "Tonight", otherwise show "Tomorrow"
    if (hour >= 17) {
      return 'Tonight';
    } else {
      return 'Tomorrow';
    }
  };

  const getWeekendLabel = (): string => {
    const now = new Date();
    const dayOfWeek = now.getDay();
    
    // If it's already weekend (Fri evening, Sat, or Sun), show "This Weekend"
    // Otherwise show "Weekend"
    if (dayOfWeek === 5 && now.getHours() >= 17) return 'This Weekend';
    if (dayOfWeek === 6 || dayOfWeek === 0) return 'This Weekend';
    return 'Weekend';
  };

  const dynamicLabel = getDynamicLabel();
  const weekendLabel = getWeekendLabel();

  const timeOptions = [
    { key: 'now' as const, label: 'Now', icon: Clock },
    { key: (dynamicLabel === 'Tonight' ? 'tonight' : 'tomorrow') as const, label: dynamicLabel, icon: Clock },
    { key: 'weekend' as const, label: weekendLabel, icon: Calendar },
  ];

  return (
    <div className="px-6 mb-4">
      <div className="flex gap-2">
        {timeOptions.map(({ key, label, icon: Icon }) => (
          <button
            key={key}
            onClick={() => onChange(key)}
            className={cn(
              'flex items-center gap-1.5 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              value === key
                ? 'bg-white text-gray-900 shadow-lg scale-105'
                : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white scale-100'
            )}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
        
        {/* Calendar Button */}
        <button
          onClick={onCalendarClick}
          className={cn(
            'flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
            value === 'custom'
              ? 'bg-white text-gray-900 shadow-lg scale-105'
              : 'bg-white/10 text-white/70 hover:bg-white/20 hover:text-white scale-100'
          )}
        >
          <Calendar className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};