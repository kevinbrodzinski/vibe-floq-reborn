import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database } from '@/integrations/supabase/types';
import { Sparkles, Users, MapPin, Calendar } from 'lucide-react';

type AfterglowRow = Database['public']['Tables']['daily_afterglow']['Row'];

interface AfterglowCardProps {
  afterglow: AfterglowRow;
  onRefresh?: () => void;
  isStale?: boolean;
}

export const AfterglowCard = ({ afterglow, onRefresh, isStale }: AfterglowCardProps) => {
  const localDate = new Date(afterglow.date + 'T00:00:00');
  const isToday = new Date(afterglow.date).toDateString() === new Date().toDateString();
  
  // Provide fallback vibe estimation for zero-data guard
  const hasRealData = 
    (afterglow.total_venues || 0) > 0 ||
    (afterglow.crossed_paths_count || 0) > 0 ||
    (afterglow.total_floqs || 0) > 0;

  const vibeIntensity = hasRealData
    ? afterglow.energy_score || 0
    : Math.round(Math.random() * 10) + 5; // 5-15% pleasant baseline

  const dominantVibe = hasRealData
    ? afterglow.dominant_vibe
    : 'chill'; // default fallback vibe

  return (
    <Card className="bg-gradient-to-b from-background/95 to-muted/50 p-6 backdrop-blur-sm border-border/50">
      {/* Header with status indicator only */}
      {isStale && (
        <div className="flex items-center justify-end gap-2 text-amber-500 text-xs mb-6">
          <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
          Updating...
        </div>
      )}

      {/* AI Summary */}
      {afterglow.ai_summary && (
        <div className="mb-6 p-4 rounded-lg bg-muted/30 border border-border/30">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Energy Summary</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {afterglow.ai_summary}
          </p>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <Metric 
          label="total venues"
          value={afterglow.total_venues || 0}
          color="violet" 
        />
        <Metric 
          label="people crossed"
          value={afterglow.crossed_paths_count || 0}
          color="sky" 
        />
        <Metric 
          label="floqs joined"
          value={afterglow.total_floqs || 0}
          color="emerald" 
        />
        <div className="col-span-2 flex flex-col items-center p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
          <span className="text-3xl font-semibold text-primary">
            {vibeIntensity}%
          </span>
          <span className="text-sm text-muted-foreground">peak vibe intensity</span>
          {dominantVibe && (
            <span className="text-sm capitalize text-primary/80 mt-1">
              {dominantVibe}
            </span>
          )}
        </div>
      </div>

      {/* Conditional Action Button */}
      {!isToday && onRefresh && (
        <Button 
          className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          onClick={onRefresh}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Revisit this day
        </Button>
      )}
      {isToday && onRefresh && (
        <Button 
          className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          onClick={onRefresh}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      )}

      {/* Crossed Paths Section */}
      {afterglow.crossed_paths_count > 0 && (
        <div className="mt-6 pt-6 border-t border-border/30">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-lg font-medium text-foreground">Crossed Paths</h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {/* Placeholder avatars for crossed paths */}
              {Array.from({ length: Math.min(afterglow.crossed_paths_count, 3) }).map((_, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border-2 border-background flex items-center justify-center"
                >
                  <Users className="w-3 h-3 text-primary/60" />
                </div>
              ))}
              {afterglow.crossed_paths_count > 3 && (
                <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium text-muted-foreground">
                  +{afterglow.crossed_paths_count - 3}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </Card>
  );
};

const Metric = ({ 
  label, 
  value, 
  color = 'slate' 
}: { 
  label: string; 
  value: number; 
  color?: 'violet' | 'sky' | 'emerald' | 'slate';
}) => {
  const colorClasses = {
    violet: 'text-violet-400',
    sky: 'text-sky-400', 
    emerald: 'text-emerald-400',
    slate: 'text-muted-foreground'
  };

  return (
    <div className="text-center">
      <span className={`text-4xl font-semibold ${colorClasses[color]}`}>
        {value}
      </span>
      <p className="uppercase tracking-wide text-xs text-muted-foreground mt-1">
        {label}
      </p>
    </div>
  );
};