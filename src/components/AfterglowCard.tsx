
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database } from '@/integrations/supabase/types';
import { Sparkles, Users, MapPin, Calendar } from 'lucide-react';
import { isToday } from '@/utils/date';

type AfterglowRow = Database['public']['Tables']['daily_afterglow']['Row'];

interface AfterglowCardProps {
  afterglow: AfterglowRow | null;
  onRefresh?: () => void;
  isStale?: boolean;
  date: string;
}

export const AfterglowCard = ({ afterglow, onRefresh, isStale, date }: AfterglowCardProps) => {
  const isCurrentDay = isToday(date);
  
  // Default values for when there's no afterglow data
  const displayData = {
    energy_score: afterglow?.energy_score || 0,
    total_venues: afterglow?.total_venues || 0,
    crossed_paths_count: afterglow?.crossed_paths_count || 0,
    total_floqs: afterglow?.total_floqs || 0,
    dominant_vibe: afterglow?.dominant_vibe || 'peaceful',
    ai_summary: afterglow?.ai_summary || null
  };

  return (
    <Card className="bg-gradient-to-b from-background/95 to-muted/50 p-6 backdrop-blur-sm border-border/50">
      {/* Header with stale indicator */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-semibold text-foreground">
            afterglow
          </h2>
        </div>
        {isStale && (
          <div className="flex items-center gap-2 text-amber-500 text-xs">
            <div className="w-2 h-2 rounded-full bg-amber-500 animate-pulse" />
            Updating...
          </div>
        )}
      </div>

      {/* AI Summary */}
      {displayData.ai_summary && (
        <div className="mb-6 p-4 rounded-lg bg-muted/30 border border-border/30">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Energy Summary</span>
          </div>
          <p className="text-sm text-muted-foreground leading-relaxed">
            {displayData.ai_summary}
          </p>
        </div>
      )}

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 gap-6 mb-6">
        <Metric 
          label="total venues"
          value={displayData.total_venues}
          color="violet" 
        />
        <Metric 
          label="people crossed"
          value={displayData.crossed_paths_count}
          color="sky" 
        />
        <Metric 
          label="floqs joined"
          value={displayData.total_floqs}
          color="emerald" 
        />
        <div className="col-span-2 flex flex-col items-center p-4 rounded-lg bg-gradient-to-br from-primary/10 to-primary/5 border border-primary/20">
          <span className="text-3xl font-semibold text-primary">
            {displayData.energy_score}%
          </span>
          <span className="text-sm text-muted-foreground">peak vibe intensity</span>
          {displayData.dominant_vibe && (
            <span className="text-sm capitalize text-primary/80 mt-1">
              {displayData.dominant_vibe}
            </span>
          )}
        </div>
      </div>

      {/* Conditional Action Button */}
      {!isCurrentDay && (
        <Button 
          className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          onClick={onRefresh}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Revisit this day
        </Button>
      )}

      {isCurrentDay && onRefresh && (
        <Button 
          className="w-full bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70"
          onClick={onRefresh}
        >
          <Sparkles className="w-4 h-4 mr-2" />
          Refresh
        </Button>
      )}

      {/* Crossed Paths Section */}
      {displayData.crossed_paths_count > 0 && (
        <div className="mt-6 pt-6 border-t border-border/30">
          <div className="flex items-center gap-2 mb-3">
            <Users className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-lg font-medium text-foreground">Crossed Paths</h3>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex -space-x-2">
              {/* Placeholder avatars for crossed paths */}
              {Array.from({ length: Math.min(displayData.crossed_paths_count, 3) }).map((_, i) => (
                <div
                  key={i}
                  className="w-8 h-8 rounded-full bg-gradient-to-br from-primary/20 to-primary/10 border-2 border-background flex items-center justify-center"
                >
                  <Users className="w-3 h-3 text-primary/60" />
                </div>
              ))}
              {displayData.crossed_paths_count > 3 && (
                <div className="w-8 h-8 rounded-full bg-muted border-2 border-background flex items-center justify-center text-xs font-medium text-muted-foreground">
                  +{displayData.crossed_paths_count - 3}
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
