
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Database } from '@/integrations/supabase/types';
import { Sparkles, Users } from 'lucide-react';

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
    <Card className="w-[92%] mx-auto relative overflow-hidden bg-gradient-to-br from-[#5b3eff] via-[#5b3eff]/20 to-black/90 border border-violet-500/20 rounded-3xl shadow-neon-glow backdrop-blur-sm">
      {/* Inner glow effect */}
      <div className="absolute inset-0 bg-gradient-radial from-white/5 via-transparent to-transparent pointer-events-none" />
      
      <div className="relative p-6 space-y-6">
        {/* Header with status indicator */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold text-slate-200 font-space-grotesk">
            Energy Summary
          </h2>
          {isStale && (
            <div className="flex items-center gap-2 text-amber-400 text-sm">
              <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
              <span>Updating...</span>
            </div>
          )}
        </div>

        {/* AI Summary */}
        {afterglow.ai_summary && (
          <div className="p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-4 h-4 text-violet-400" />
              <span className="text-sm font-medium text-slate-200">AI Summary</span>
            </div>
            <p className="text-sm text-slate-300 leading-relaxed">
              {afterglow.ai_summary}
            </p>
          </div>
        )}

        {/* 3-Column Metrics Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Row 1: Total Venues and People Crossed */}
          <MetricCard 
            label="TOTAL VENUES"
            value={afterglow.total_venues || 0}
            color="violet"
          />
          <MetricCard 
            label="PEOPLE CROSSED"
            value={afterglow.crossed_paths_count || 0}
            color="sky"
          />
        </div>
        
        {/* Row 2: Floqs Joined (full width) */}
        <div className="grid grid-cols-1">
          <MetricCard 
            label="FLOQS JOINED"
            value={afterglow.total_floqs || 0}
            color="emerald"
          />
        </div>

        {/* Vibe Intensity Slab */}
        <div className="h-[140px] border border-violet-400/50 rounded-xl bg-gradient-radial from-white/5 via-transparent to-transparent backdrop-blur-sm flex flex-col items-center justify-center space-y-2">
          <div 
            className="text-6xl font-bold animate-glow-pulse"
            style={{ 
              color: '#b79bff',
              textShadow: '0 0 20px rgba(183, 155, 255, 0.5)'
            }}
          >
            {vibeIntensity}%
          </div>
          <div className="text-sm text-slate-200 font-space-grotesk">
            peak vibe intensity
          </div>
          {dominantVibe && (
            <div className="text-lg font-medium text-violet-400 capitalize font-space-grotesk">
              {dominantVibe}
            </div>
          )}
        </div>

        {/* CTA Button */}
        {!isToday && onRefresh && (
          <Button 
            className="w-full h-14 rounded-full bg-gradient-to-r from-violet-400 to-cyan-400 hover:from-violet-500 hover:to-cyan-500 text-white font-bold text-lg shadow-lg transition-all duration-200"
            onClick={onRefresh}
          >
            <Sparkles className="w-[18px] h-[18px] mr-2" strokeWidth={1.5} />
            Revisit this day
          </Button>
        )}
        {isToday && onRefresh && (
          <Button 
            className="w-full h-14 rounded-full bg-gradient-to-r from-violet-400 to-cyan-400 hover:from-violet-500 hover:to-cyan-500 text-white font-bold text-lg shadow-lg transition-all duration-200"
            onClick={onRefresh}
          >
            <Sparkles className="w-[18px] h-[18px] mr-2" strokeWidth={1.5} />
            Refresh
          </Button>
        )}

        {/* Crossed Paths Section */}
        {afterglow.crossed_paths_count > 0 && (
          <div className="pt-6 border-t border-white/10">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-slate-400" />
              <h3 className="text-lg font-medium text-slate-200 font-space-grotesk">Crossed Paths</h3>
            </div>
            <div className="flex items-center gap-2">
              <div className="flex -space-x-2">
                {/* Placeholder avatars for crossed paths */}
                {Array.from({ length: Math.min(afterglow.crossed_paths_count, 3) }).map((_, i) => (
                  <div
                    key={i}
                    className="w-8 h-8 rounded-full bg-gradient-to-br from-violet-400/20 to-cyan-400/20 border-2 border-slate-800 flex items-center justify-center"
                  >
                    <Users className="w-3 h-3 text-violet-400/60" />
                  </div>
                ))}
                {afterglow.crossed_paths_count > 3 && (
                  <div className="w-8 h-8 rounded-full bg-slate-700 border-2 border-slate-800 flex items-center justify-center text-xs font-medium text-slate-300">
                    +{afterglow.crossed_paths_count - 3}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </Card>
  );
};

const MetricCard = ({ 
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
    slate: 'text-slate-400'
  };

  const gradientClasses = {
    violet: 'from-violet-400 to-violet-600',
    sky: 'from-sky-400 to-sky-600',
    emerald: 'from-emerald-400 to-emerald-600',
    slate: 'from-slate-400 to-slate-600'
  };

  return (
    <div className="text-center p-4 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
      <div 
        className={`text-7xl font-bold bg-gradient-to-br ${gradientClasses[color]} bg-clip-text text-transparent mb-2 font-space-grotesk`}
        style={{
          textShadow: color === 'violet' ? '0 0 20px rgba(167, 139, 250, 0.3)' :
                      color === 'sky' ? '0 0 20px rgba(56, 189, 248, 0.3)' :
                      color === 'emerald' ? '0 0 20px rgba(52, 211, 153, 0.3)' : 'none'
        }}
      >
        {value}
      </div>
      <p className="text-sm uppercase tracking-wider text-slate-400 font-space-grotesk font-medium">
        {label}
      </p>
    </div>
  );
};
