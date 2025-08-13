import React, { useState, useMemo } from 'react';
import { Calendar, Clock } from 'lucide-react';
import { motion } from 'framer-motion';

export type TimeOption = 'now' | 'tonight' | 'tomorrow' | 'weekend' | 'custom';

interface DateTimeSelectorProps {
  selectedTime: TimeOption;
  onTimeChange: (time: TimeOption) => void;
  customDate?: Date;
  onCustomDateChange?: (date: Date) => void;
  className?: string;
}

export const DateTimeSelector: React.FC<DateTimeSelectorProps> = ({
  selectedTime,
  onTimeChange,
  customDate,
  onCustomDateChange,
  className = ''
}) => {
  const [showCalendar, setShowCalendar] = useState(false);

  // Smart button logic based on current time
  const buttonOptions = useMemo(() => {
    const now = new Date();
    const currentHour = now.getHours();
    
    const options = [
      {
        key: 'now' as const,
        label: 'Now',
        description: 'Within the next 2 hours'
      }
    ];

    // Second button logic: Tonight vs Tomorrow
    if (currentHour >= 7 && currentHour <= 26) { // 7 PM to 2 AM (26 = 2 AM next day)
      options.push({
        key: 'tomorrow' as const,
        label: 'Tomorrow',
        description: 'Tomorrow evening'
      });
    } else {
      options.push({
        key: 'tonight' as const,
        label: 'Tonight',
        description: 'This evening (7 PM - 2 AM)'
      });
    }

    // Always show weekend
    options.push({
      key: 'weekend' as const,
      label: 'Weekend',
      description: 'This weekend'
    });

    return options;
  }, []);

  const handleCalendarClick = () => {
    setShowCalendar(true);
    // TODO: Implement calendar modal
    // For now, just set to custom
    onTimeChange('custom');
  };

  const getButtonContent = (option: { key: TimeOption; label: string; description: string }) => {
    if (option.key === 'now') {
      return (
        <div className="flex items-center gap-2">
          <Clock className="w-4 h-4" />
          <span>{option.label}</span>
        </div>
      );
    }
    return option.label;
  };

  const getCustomDateDisplay = () => {
    if (!customDate) return 'Custom';
    
    const now = new Date();
    const isToday = customDate.toDateString() === now.toDateString();
    const isTomorrow = customDate.toDateString() === new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString();
    
    if (isToday) return 'Today';
    if (isTomorrow) return 'Tomorrow';
    
    return customDate.toLocaleDateString('en-US', { 
      weekday: 'short', 
      month: 'short', 
      day: 'numeric' 
    });
  };

  return (
    <div className={`space-y-3 ${className}`}>
      {/* Time Selection Pills */}
      <div className="flex items-center gap-2 flex-wrap">
        {buttonOptions.map((option) => (
          <motion.button
            key={option.key}
            onClick={() => onTimeChange(option.key)}
            className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
              selectedTime === option.key
                ? 'bg-white text-gray-900 shadow-lg scale-105'
                : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white hover:scale-102'
            }`}
            whileHover={{ scale: selectedTime === option.key ? 1.05 : 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            {getButtonContent(option)}
          </motion.button>
        ))}
        
        {/* Custom Date/Calendar Button */}
        <motion.button
          onClick={handleCalendarClick}
          className={`px-4 py-2.5 rounded-xl text-sm font-medium transition-all duration-200 flex items-center gap-2 ${
            selectedTime === 'custom'
              ? 'bg-white text-gray-900 shadow-lg scale-105'
              : 'bg-white/10 text-white/80 hover:bg-white/20 hover:text-white hover:scale-102'
          }`}
          whileHover={{ scale: selectedTime === 'custom' ? 1.05 : 1.02 }}
          whileTap={{ scale: 0.98 }}
        >
          <Calendar className="w-4 h-4" />
          <span>{selectedTime === 'custom' ? getCustomDateDisplay() : 'Pick date'}</span>
        </motion.button>
      </div>

      {/* Selected Time Description */}
      <div className="text-xs text-white/60 px-1">
        {selectedTime === 'custom' && customDate ? (
          `Selected: ${customDate.toLocaleDateString('en-US', { 
            weekday: 'long', 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit'
          })}`
        ) : (
          buttonOptions.find(opt => opt.key === selectedTime)?.description || 'Select a time'
        )}
      </div>

      {/* Calendar Modal Placeholder */}
      {showCalendar && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-2xl p-6 m-4 max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-4 text-gray-900">Select Date & Time</h3>
            <p className="text-gray-600 mb-4">Calendar picker coming soon!</p>
            <button
              onClick={() => setShowCalendar(false)}
              className="w-full bg-gray-900 text-white py-2 rounded-lg hover:bg-gray-800 transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};