
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar as CalendarIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';

interface SimpleDateTimePickerProps {
  date?: Date;
  onDateChange: (date: Date | undefined) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export function SimpleDateTimePicker({
  date,
  onDateChange,
  placeholder = "Select date and time",
  className,
  disabled = false,
}: SimpleDateTimePickerProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [timeValue, setTimeValue] = useState(
    date ? format(date, 'HH:mm') : '12:00'
  );

  const handleQuickSelect = (hours: number) => {
    const newDate = new Date();
    newDate.setHours(newDate.getHours() + hours, 0, 0, 0);
    const timeString = format(newDate, 'HH:mm');
    setTimeValue(timeString);
    onDateChange(newDate);
    setIsOpen(false);
  };

  const handleClear = () => {
    onDateChange(undefined);
    setIsOpen(false);
  };

  return (
    <Popover open={isOpen} onOpenChange={setIsOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "w-full justify-start text-left font-normal",
            !date && "text-muted-foreground",
            className
          )}
          disabled={disabled}
        >
          <CalendarIcon className="mr-2 h-4 w-4" />
          {date ? (
            <span className="flex items-center gap-2">
              {format(date, "PPP")}
              <Clock className="h-3 w-3" />
              {format(date, "HH:mm")}
            </span>
          ) : (
            placeholder
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-3" align="start">
        <div className="space-y-3">
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickSelect(1)}
              className="flex-1"
            >
              +1h
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickSelect(2)}
              className="flex-1"
            >
              +2h
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleQuickSelect(4)}
              className="flex-1"
            >
              +4h
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={handleClear} className="flex-1">
              Clear
            </Button>
            <Button size="sm" onClick={() => setIsOpen(false)} className="flex-1">
              Done
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
