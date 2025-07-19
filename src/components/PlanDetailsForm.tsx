import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Clock } from 'lucide-react';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { vibeOptions } from '@/lib/vibeConstants';

interface PlanDetailsFormProps {
  onSubmit: (details: PlanDetails) => void;
  onCancel: () => void;
  initialData?: Partial<PlanDetails>;
}

export interface PlanDetails {
  title: string;
  description: string;
  date: Date;
  startTime: string;
  endTime: string;
  maxParticipants: number;
  vibe: string;
  budget?: number;
}

export const PlanDetailsForm = ({ onSubmit, onCancel, initialData }: PlanDetailsFormProps) => {
  const [title, setTitle] = useState(initialData?.title || '');
  const [description, setDescription] = useState(initialData?.description || '');
  const [date, setDate] = useState<Date | undefined>(initialData?.date);
  const [startTime, setStartTime] = useState(initialData?.startTime || '18:00');
  const [endTime, setEndTime] = useState(initialData?.endTime || '23:00');
  const [maxParticipants, setMaxParticipants] = useState(initialData?.maxParticipants || 8);
  const [vibe, setVibe] = useState(initialData?.vibe || 'social');
  const [budget, setBudget] = useState(initialData?.budget || '');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!title.trim() || !date) return;

    onSubmit({
      title: title.trim(),
      description: description.trim(),
      date,
      startTime,
      endTime,
      maxParticipants,
      vibe,
      budget: budget ? Number(budget) : undefined
    });
  };

  const isValid = title.trim().length > 0 && date;

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="space-y-2">
        <Label htmlFor="title">Plan Title *</Label>
        <Input
          id="title"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="What's the plan?"
          aria-label="Plan title"
          autoFocus
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Tell your friends what to expect..."
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label>Date *</Label>
          <Popover>
            <PopoverTrigger asChild>
              <Button
                variant="outline"
                className={cn(
                  "w-full justify-start text-left font-normal",
                  !date && "text-muted-foreground"
                )}
              >
                <CalendarIcon className="mr-2 h-4 w-4" />
                {date ? format(date, "PPP") : <span>Pick a date</span>}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="start">
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                disabled={(date) => date < new Date()}
                initialFocus
                className="p-3 pointer-events-auto"
              />
            </PopoverContent>
          </Popover>
        </div>

        <div className="space-y-2">
          <Label htmlFor="max-participants">Max People</Label>
          <Input
            id="max-participants"
            type="number"
            min="2"
            max="20"
            value={maxParticipants}
            onChange={(e) => setMaxParticipants(Number(e.target.value))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="start-time">
            <Clock className="w-4 h-4 inline mr-1" />
            Start Time
          </Label>
          <Input
            id="start-time"
            type="time"
            value={startTime}
            onChange={(e) => setStartTime(e.target.value)}
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="end-time">End Time</Label>
          <Input
            id="end-time"
            type="time"
            value={endTime}
            onChange={(e) => setEndTime(e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Vibe</Label>
        <div className="grid grid-cols-3 gap-2">
          {vibeOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setVibe(option.id)}
              className={cn(
                "p-3 rounded-xl border text-sm font-medium transition-all",
                vibe === option.id
                  ? "border-primary bg-primary/10 text-primary"
                  : "border-border hover:border-border/60 hover:bg-card/50"
              )}
            >
              <div className="text-lg mb-1">{option.emoji}</div>
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="budget">Budget per person (optional)</Label>
        <Input
          id="budget"
          type="number"
          min="0"
          value={budget}
          onChange={(e) => setBudget(e.target.value)}
          placeholder="0"
        />
      </div>

      <div className="flex justify-end gap-3 pt-4">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" disabled={!isValid}>
          Create Plan
        </Button>
      </div>
    </form>
  );
};