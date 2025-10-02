import { useState, useEffect } from 'react';
import { GlassCard } from '../shared/GlassCard';
import { AuroraBackground } from '../shared/AuroraBackground';
import { Users, Zap, MapPin } from 'lucide-react';

/**
 * Field Reveal Screen - Live city preview
 * Shows the "Field coming alive" with stats
 */
export function FieldRevealScreen() {
  const [stats, setStats] = useState({ users: 0, floqs: 0, venues: 0 });

  useEffect(() => {
    // Animate numbers counting up
    const targets = { users: 127, floqs: 23, venues: 45 };
    const duration = 1500;
    const steps = 30;
    const interval = duration / steps;

    let step = 0;
    const timer = setInterval(() => {
      step++;
      const progress = step / steps;
      
      setStats({
        users: Math.floor(targets.users * progress),
        floqs: Math.floor(targets.floqs * progress),
        venues: Math.floor(targets.venues * progress),
      });

      if (step >= steps) clearInterval(timer);
    }, interval);

    return () => clearInterval(timer);
  }, []);

  return (
    <div className="relative min-h-screen p-6">
      <AuroraBackground />
      
      <div className="relative z-10 max-w-md mx-auto space-y-6">
        <div className="text-center mb-8 animate-fade-in">
          <h2 className="text-2xl font-bold mb-2">Your City, Live</h2>
          <p className="text-sm text-muted-foreground">Watch the Field come alive</p>
        </div>

        {/* Map Preview (simplified visual) */}
        <GlassCard variant="elevated" className="aspect-square relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-blue-500/20" />
          
          {/* Pulsing clusters */}
          {[
            { x: '20%', y: '30%', delay: 0 },
            { x: '60%', y: '40%', delay: 200 },
            { x: '40%', y: '70%', delay: 400 },
            { x: '75%', y: '25%', delay: 600 },
          ].map((dot, i) => (
            <div
              key={i}
              className="absolute h-3 w-3 bg-primary rounded-full"
              style={{ 
                left: dot.x, 
                top: dot.y,
                animation: `pulse-ring 2s ${dot.delay}ms infinite`
              }}
            >
              <div className="absolute inset-0 bg-primary rounded-full animate-ping opacity-75" />
            </div>
          ))}

          {/* Center text overlay */}
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-4xl font-bold mb-1">{stats.users}</div>
              <div className="text-xs text-muted-foreground">people online now</div>
            </div>
          </div>
        </GlassCard>

        {/* Live Stats */}
        <div className="grid grid-cols-3 gap-3">
          <GlassCard variant="subtle" className="text-center">
            <Users className="h-5 w-5 mx-auto mb-2 text-primary" />
            <div className="text-2xl font-bold">{stats.users}</div>
            <div className="text-xs text-muted-foreground">Active</div>
          </GlassCard>

          <GlassCard variant="subtle" className="text-center">
            <Zap className="h-5 w-5 mx-auto mb-2 text-yellow-500" />
            <div className="text-2xl font-bold">{stats.floqs}</div>
            <div className="text-xs text-muted-foreground">Floqs</div>
          </GlassCard>

          <GlassCard variant="subtle" className="text-center">
            <MapPin className="h-5 w-5 mx-auto mb-2 text-green-500" />
            <div className="text-2xl font-bold">{stats.venues}</div>
            <div className="text-xs text-muted-foreground">Venues</div>
          </GlassCard>
        </div>

        {/* Energy indicator */}
        <GlassCard variant="elevated" className="text-center">
          <div className="flex items-center justify-center gap-2 mb-2">
            <div className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            <span className="text-sm font-medium">High Energy Area</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Venice Beach is buzzing right now
          </p>
        </GlassCard>
      </div>
    </div>
  );
}
