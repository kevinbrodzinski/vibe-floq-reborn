import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { Calendar } from '@/components/ui/calendar';
import { Loader2, Calendar as CalendarIcon, Sparkles, TrendingUp, Zap, Heart } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useRecentAfterglows } from '@/hooks/useRecentAfterglows';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export type AfterglowCalendarDialogProps = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
};

// Energy level indicators
const getEnergyIcon = (energy: number | null) => {
  if (!energy) return null;
  if (energy >= 8) return <Zap className="w-3 h-3 text-yellow-400" />;
  if (energy >= 6) return <TrendingUp className="w-3 h-3 text-green-400" />;
  if (energy >= 4) return <Heart className="w-3 h-3 text-pink-400" />;
  return <Sparkles className="w-3 h-3 text-blue-400" />;
};

const getEnergyColor = (energy: number | null) => {
  if (!energy) return 'text-muted-foreground';
  if (energy >= 8) return 'text-yellow-400';
  if (energy >= 6) return 'text-green-400';
  if (energy >= 4) return 'text-pink-400';
  return 'text-blue-400';
};

export default function AfterglowCalendarDialog({ open, onOpenChange }: AfterglowCalendarDialogProps) {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const { data, isLoading } = useRecentAfterglows();
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(undefined);

  const currentDate = params.get('date') ? new Date(params.get('date')!) : new Date();

  const onSelect = (d: Date | undefined) => {
    if (!d) return;
    
    setSelectedDate(d);
    
    // Add a small delay for better UX
    setTimeout(() => {
      const newParams = new URLSearchParams(params);
      newParams.set('date', d.toISOString().slice(0, 10));
      navigate({ search: newParams.toString() });
      onOpenChange(false);
    }, 150);
  };

  // Quick navigation buttons
  const quickNavigate = (days: number) => {
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + days);
    onSelect(targetDate);
  };

  // Close dialog on Esc key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onOpenChange(false);
    };
    if (open) {
      window.addEventListener('keydown', handleKeyDown);
      return () => window.removeEventListener('keydown', handleKeyDown);
    }
  }, [open, onOpenChange]);

  // Reset selected date when dialog opens
  useEffect(() => {
    if (open) {
      setSelectedDate(undefined);
    }
  }, [open]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md bg-gradient-to-br from-background via-background to-muted/20 border border-border/30 backdrop-blur-xl">
        <DialogTitle className="flex items-center gap-2 text-xl font-light">
          <CalendarIcon className="w-5 h-5 text-primary" />
          Choose Your Day
        </DialogTitle>

        {isLoading && (
          <div className="flex flex-col items-center justify-center py-12 space-y-4">
            <Loader2 className="w-8 h-8 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Loading your timeline data...</p>
          </div>
        )}

        {!isLoading && (
          <div className="space-y-6">
            {/* Quick Navigation */}
            <div className="space-y-3">
              <p className="text-sm font-medium text-muted-foreground">Quick Jump</p>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => quickNavigate(-1)}
                  className="flex-1 text-xs"
                >
                  Yesterday
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => quickNavigate(-7)}
                  className="flex-1 text-xs"
                >
                  Last Week
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => onSelect(new Date())}
                  className="flex-1 text-xs"
                >
                  Today
                </Button>
              </div>
            </div>

            {/* Calendar */}
            <div className="space-y-4">
              <Calendar
                mode="single"
                selected={currentDate}
                onSelect={onSelect}
                modifiers={{ 
                  hasData: data?.hasDataDates || [],
                  selected: selectedDate ? [selectedDate] : []
                }}
                modifiersClassNames={{ 
                  hasData: 'font-bold text-primary bg-primary/10 border-primary/30',
                  selected: 'bg-primary text-primary-foreground font-bold'
                }}
                className="pointer-events-auto rounded-lg border border-border/30 bg-card/50"
                classNames={{
                  day_selected: "bg-primary text-primary-foreground hover:bg-primary/90 focus:bg-primary",
                  day_today: "bg-accent text-accent-foreground",
                  day: "h-9 w-9 p-0 font-normal aria-selected:opacity-100 hover:bg-accent hover:text-accent-foreground",
                  head_cell: "text-muted-foreground font-medium",
                  nav_button: "hover:bg-accent hover:text-accent-foreground",
                  nav_button_previous: "absolute left-1",
                  nav_button_next: "absolute right-1",
                  caption: "flex justify-center py-2 relative items-center",
                  caption_label: "text-sm font-medium",
                  nav: "space-x-1 flex items-center",
                  table: "w-full border-collapse space-y-1",
                  head_row: "flex",
                  row: "flex w-full mt-2",
                  cell: "text-center text-sm p-0 relative [&:has([aria-selected])]:bg-accent first:[&:has([aria-selected])]:rounded-l-md last:[&:has([aria-selected])]:rounded-r-md focus-within:relative focus-within:z-20"
                }}
              />
            </div>

            {/* Recent Days with Energy */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <p className="text-sm font-medium text-muted-foreground">Recent Energy</p>
                <div className="flex items-center gap-1 text-xs text-muted-foreground">
                  <Sparkles className="w-3 h-3" />
                  <span>Energy Score</span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {data?.recent.map(d => (
                  <Button
                    key={d.date}
                    variant={d.has_data ? "secondary" : "outline"}
                    size="sm"
                    onClick={() => onSelect(new Date(d.date))}
                    className={cn(
                      "h-auto p-3 flex flex-col items-center gap-1 cursor-pointer transition-all duration-200 hover:scale-105",
                      d.has_data && "border-primary/30 bg-primary/10 hover:bg-primary/20"
                    )}
                  >
                    <div className="flex items-center gap-1">
                      {getEnergyIcon(d.energy)}
                      <span className="text-xs font-medium">
                        {new Date(d.date).toLocaleDateString('en-US', { 
                          month: 'short', 
                          day: 'numeric' 
                        })}
                      </span>
                    </div>
                    <span className={cn("text-xs", getEnergyColor(d.energy))}>
                      {d.energy ? `${d.energy}/10` : 'No data'}
                    </span>
                    {d.has_data && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                        {d.total_venues && d.total_venues > 0 && (
                          <span className="px-1 py-0.5 bg-blue-500/20 text-blue-400 rounded text-xs">
                            {d.total_venues} venue{d.total_venues !== 1 ? 's' : ''}
                          </span>
                        )}
                        {d.crossed_paths_count && d.crossed_paths_count > 0 && (
                          <span className="px-1 py-0.5 bg-green-500/20 text-green-400 rounded text-xs">
                            {d.crossed_paths_count} path{d.crossed_paths_count !== 1 ? 's' : ''}
                          </span>
                        )}
                      </div>
                    )}
                  </Button>
                ))}
              </div>
            </div>

            {/* Selected Date Preview */}
            {selectedDate && (
              <div className="p-3 rounded-lg bg-primary/10 border border-primary/30 animate-in fade-in duration-200">
                <div className="flex items-center gap-2">
                  <CalendarIcon className="w-4 h-4 text-primary" />
                  <span className="text-sm font-medium">
                    {selectedDate.toLocaleDateString('en-US', { 
                      weekday: 'long', 
                      year: 'numeric', 
                      month: 'long', 
                      day: 'numeric' 
                    })}
                  </span>
                </div>
              </div>
            )}

            {/* Summary Stats */}
            {data?.stats && data.stats.daysWithData > 0 && (
              <div className="p-4 rounded-lg bg-muted/30 border border-border/30">
                <p className="text-sm font-medium text-muted-foreground mb-3">Your Timeline Stats</p>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-3 h-3 text-primary" />
                    <span className="text-muted-foreground">Avg Energy:</span>
                    <span className="font-medium">{data.stats.averageEnergy}/10</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-3 h-3 text-green-400" />
                    <span className="text-muted-foreground">Peak Energy:</span>
                    <span className="font-medium">{data.stats.highestEnergy}/10</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <CalendarIcon className="w-3 h-3 text-blue-400" />
                    <span className="text-muted-foreground">Days with Data:</span>
                    <span className="font-medium">{data.stats.daysWithData}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Zap className="w-3 h-3 text-yellow-400" />
                    <span className="text-muted-foreground">Total Venues:</span>
                    <span className="font-medium">{data.stats.totalVenues}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}