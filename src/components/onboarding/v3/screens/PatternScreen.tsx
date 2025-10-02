import { GlassCard } from '../shared/GlassCard';
import { AuroraBackground } from '../shared/AuroraBackground';
import { AlertCircle, Calendar, MapPin, Users } from 'lucide-react';

/**
 * Pattern Screen - THE MAGIC MOMENT
 * "WE FOUND SOMETHING" - pattern detection reveal
 */
export function PatternScreen() {
  return (
    <div className="relative min-h-screen p-6">
      <AuroraBackground />
      
      <div className="relative z-10 max-w-md mx-auto space-y-6">
        {/* Alert banner */}
        <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-4 animate-pulse-once">
          <div className="flex items-start gap-3">
            <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-bold text-red-500 mb-1">WE FOUND SOMETHING</div>
              <div className="text-sm text-red-400/90">
                Your social life has been happening without you
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mb-4 animate-fade-in" style={{ animationDelay: '200ms' }}>
          <h2 className="text-2xl font-bold mb-2">Pattern Detected</h2>
          <p className="text-sm text-muted-foreground">
            You've been missing connections
          </p>
        </div>

        {/* Thursday crew pattern */}
        <GlassCard variant="elevated" className="space-y-4" animate>
          <div className="flex items-start justify-between">
            <div>
              <div className="font-bold text-lg mb-1">Thursday Crew</div>
              <div className="text-sm text-muted-foreground">Your regular squad</div>
            </div>
            <div className="px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-xs text-primary">
              8 weeks
            </div>
          </div>

          <div className="space-y-2 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <Calendar className="h-4 w-4" />
              <span>Every Thursday, 7-11pm</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <MapPin className="h-4 w-4" />
              <span>Venice Beach area</span>
            </div>
            <div className="flex items-center gap-2 text-muted-foreground">
              <Users className="h-4 w-4" />
              <span>5-7 people consistently</span>
            </div>
          </div>

          <div className="pt-3 border-t border-white/10">
            <div className="text-xs text-muted-foreground mb-2">Last seen together:</div>
            <div className="flex -space-x-2">
              {['Sarah', 'Mike', 'Alex', 'Jamie', 'Chris'].map((name, i) => (
                <div 
                  key={name}
                  className="h-8 w-8 rounded-full bg-gradient-to-br from-primary/40 to-blue-500/40 border-2 border-background flex items-center justify-center text-xs"
                  title={name}
                >
                  {name[0]}
                </div>
              ))}
            </div>
          </div>
        </GlassCard>

        {/* Near-miss history */}
        <GlassCard variant="subtle" className="space-y-3">
          <div className="font-medium text-sm">Recent Near-Misses</div>
          
          {[
            { venue: 'The Waterfront', time: '2 days ago', distance: '0.2 mi' },
            { venue: 'Blue Bottle Coffee', time: '5 days ago', distance: '0.1 mi' },
            { venue: 'Muscle Beach', time: '1 week ago', distance: '0.3 mi' },
          ].map((miss, i) => (
            <div 
              key={i}
              className="flex items-center justify-between py-2 border-b border-white/5 last:border-0"
              style={{ animationDelay: `${i * 100 + 400}ms` }}
            >
              <div>
                <div className="text-sm font-medium">{miss.venue}</div>
                <div className="text-xs text-muted-foreground">{miss.time}</div>
              </div>
              <div className="text-xs text-yellow-500">{miss.distance} away</div>
            </div>
          ))}
        </GlassCard>

        {/* CTA */}
        <div className="text-center text-sm text-muted-foreground">
          Floq helps you never miss these moments again
        </div>
      </div>
    </div>
  );
}
