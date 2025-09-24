import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, Heart, Users, MapPin } from 'lucide-react';
import { type Vibe } from '@/lib/vibes';
import { getVibeMeta } from '@/lib/vibeConstants';

interface OnboardingCelebrationProps {
  onComplete: () => void;
  onBack?: () => void;
  userName?: string;
  selectedVibe?: Vibe;
  isCompleting?: boolean;
}

export function OnboardingCelebration({ 
  onComplete, 
  onBack, 
  userName, 
  selectedVibe,
  isCompleting = false
}: OnboardingCelebrationProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const vibeMeta = selectedVibe ? getVibeMeta(selectedVibe) : null;

  useEffect(() => {
    // Trigger confetti animation
    const timer = setTimeout(() => setShowConfetti(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="text-center space-y-6 relative">
      {/* Confetti Animation */}
      {showConfetti && (
        <div className="absolute inset-0 pointer-events-none overflow-hidden">
          {[...Array(20)].map((_, i) => (
            <div
              key={i}
              className="absolute w-2 h-2 rounded-full bg-primary animate-bounce"
              style={{
                left: `${Math.random() * 100}%`,
                animationDelay: `${Math.random() * 2}s`,
                animationDuration: `${2 + Math.random() * 2}s`,
              }}
            />
          ))}
        </div>
      )}

      <div className="space-y-4">
        <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-primary/60 flex items-center justify-center mx-auto animate-scale-in">
          <Sparkles className="w-10 h-10 text-white" />
        </div>
        
        <div className="space-y-2">
          <h2 className="text-3xl font-bold">
            Welcome to Floq{userName ? `, ${userName}` : ''}! 🎉
          </h2>
          <p className="text-lg text-muted-foreground">
            You're all set up and ready to explore
          </p>
        </div>
      </div>

      {vibeMeta && (
        <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-6 space-y-3">
          <div className="text-2xl">{vibeMeta.emoji}</div>
          <h3 className="font-semibold">Your {vibeMeta.label} Vibe</h3>
          <p className="text-sm text-muted-foreground">
            Perfect for {vibeMeta.energy} energy moments and {vibeMeta.social} experiences
          </p>
        </div>
      )}

      <div className="grid grid-cols-3 gap-4 py-4">
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
            <MapPin className="w-6 h-6 text-muted-foreground" />
          </div>
          <div className="text-xs text-muted-foreground">Discover<br />nearby floqs</div>
        </div>
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
            <Users className="w-6 h-6 text-muted-foreground" />
          </div>
          <div className="text-xs text-muted-foreground">Connect with<br />like-minded people</div>
        </div>
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-full bg-muted flex items-center justify-center mx-auto">
            <Heart className="w-6 h-6 text-muted-foreground" />
          </div>
          <div className="text-xs text-muted-foreground">Share your<br />authentic moments</div>
        </div>
      </div>

      <div className="flex gap-3 pt-4">
        {onBack && (
          <Button variant="outline" onClick={onBack} className="flex-1" disabled={isCompleting}>
            Back
          </Button>
        )}
        <Button 
          onClick={onComplete}
          disabled={isCompleting}
          className="flex-1"
          size="lg"
        >
          {isCompleting ? (
            <>
              <Sparkles className="w-4 h-4 mr-2 animate-spin" />
              Setting up...
            </>
          ) : (
            "Enter Floq ✨"
          )}
        </Button>
      </div>
    </div>
  );
}