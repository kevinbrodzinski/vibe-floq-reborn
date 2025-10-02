import { AuroraBackground } from '../shared/AuroraBackground';
import { LiveCounter } from '../shared/LiveCounter';
import { Sparkles } from 'lucide-react';

/**
 * Welcome Screen - The opening promise
 * Time-aware greeting + live social proof
 */
export function WelcomeScreen() {
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  const tagline = hour < 12 
    ? 'Start your day with purpose' 
    : hour < 22 
      ? 'Tonight starts now' 
      : 'Late night magic';

  return (
    <div className="relative min-h-screen flex items-center justify-center p-6">
      <AuroraBackground />
      
      <div className="relative z-10 max-w-md w-full text-center animate-fade-in">
        {/* Logo with shimmer */}
        <div className="mb-8 flex justify-center">
          <div className="relative">
            <Sparkles className="h-16 w-16 text-primary animate-pulse" />
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500 to-blue-500 opacity-50 blur-xl animate-pulse" />
          </div>
        </div>

        {/* Time-based greeting */}
        <h1 className="text-4xl font-bold mb-3 bg-gradient-to-r from-foreground to-foreground/70 bg-clip-text text-transparent">
          {greeting}
        </h1>
        
        <p className="text-xl text-muted-foreground mb-2">
          Welcome to Floq
        </p>
        
        <p className="text-sm text-muted-foreground/70 mb-8">
          {tagline}
        </p>

        {/* Value proposition */}
        <div className="bg-background/40 backdrop-blur-xl border border-white/10 rounded-2xl p-6 mb-6">
          <p className="text-lg mb-4">
            Your social life has been happening without you
          </p>
          <p className="text-sm text-muted-foreground">
            See the city through a completely new lens
          </p>
        </div>

        {/* Live counter for FOMO */}
        <div className="flex justify-center mb-8">
          <LiveCounter />
        </div>

        {/* BETA badge */}
        <div className="inline-flex items-center gap-2 px-3 py-1 bg-primary/10 border border-primary/20 rounded-full text-xs text-primary">
          <span className="h-1.5 w-1.5 bg-primary rounded-full animate-pulse" />
          BETA
        </div>
      </div>
    </div>
  );
}
