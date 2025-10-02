import { GlassCard } from '../shared/GlassCard';
import { AuroraBackground } from '../shared/AuroraBackground';
import { Sparkles, Zap, Users, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

/**
 * Archetype Screen - Personality reveal with growth path
 * "The Connector" - makes completion feel like achievement
 */
export function ArchetypeScreen() {
  return (
    <div className="relative min-h-screen p-6">
      <AuroraBackground />
      
      <div className="relative z-10 max-w-md mx-auto space-y-6">
        <div className="text-center mb-8 animate-fade-in">
          <div className="flex justify-center mb-4">
            <div className="relative">
              <Sparkles className="h-12 w-12 text-primary animate-pulse" />
              <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 opacity-50 blur-xl animate-pulse" />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-2">You're a Connector</h2>
          <p className="text-sm text-muted-foreground">
            Level 1 • Potential Unlocked
          </p>
        </div>

        {/* Archetype card */}
        <GlassCard variant="elevated" className="relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/20 to-blue-500/20" />
          
          <div className="relative space-y-4">
            <div className="text-center mb-6">
              <div className="text-lg font-bold mb-2">Your Superpower</div>
              <p className="text-sm text-muted-foreground">
                You bring people together and create unforgettable moments
              </p>
            </div>

            <div className="space-y-3">
              {[
                { icon: Users, text: 'Natural at building communities' },
                { icon: Zap, text: 'Energize every gathering you attend' },
                { icon: TrendingUp, text: 'Turn strangers into lifelong friends' },
              ].map((trait, i) => {
                const Icon = trait.icon;
                return (
                  <div 
                    key={i}
                    className="flex items-center gap-3 p-3 bg-background/20 rounded-lg"
                    style={{ animationDelay: `${i * 100 + 200}ms` }}
                  >
                    <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <Icon className="h-4 w-4 text-primary" />
                    </div>
                    <span className="text-sm">{trait.text}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </GlassCard>

        {/* First mission */}
        <GlassCard variant="elevated" className="space-y-3">
          <div className="flex items-center gap-2 mb-2">
            <div className="h-6 w-6 rounded-full bg-yellow-500/10 flex items-center justify-center">
              <Zap className="h-3 w-3 text-yellow-500" />
            </div>
            <span className="text-sm font-medium">Your First Mission</span>
          </div>
          
          <div className="text-sm text-muted-foreground">
            Create your first Floq and invite your crew to their next adventure
          </div>

          <Button className="w-full mt-4" size="lg">
            Start My Journey
          </Button>
        </GlassCard>

        {/* Progress indicator */}
        <div className="text-center">
          <div className="text-xs text-muted-foreground mb-2">Onboarding Complete</div>
          <div className="h-1 bg-background/40 rounded-full overflow-hidden">
            <div className="h-full bg-gradient-to-r from-primary to-blue-500 animate-scale-in origin-left" />
          </div>
        </div>
      </div>
    </div>
  );
}
