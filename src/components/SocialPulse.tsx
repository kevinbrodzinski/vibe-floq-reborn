import { useState, useEffect } from 'react';
import { useSocialContext } from '@/hooks/useSocialContext';
import { Users, Zap, Heart, MapPin } from 'lucide-react';

export const SocialPulse = () => {
  const { socialContext } = useSocialContext();
  const [pulseIntensity, setPulseIntensity] = useState(0);

  useEffect(() => {
    // Calculate pulse intensity based on social context
    const nearbyActiveCount = socialContext.nearbyFriends.filter(f => f.isActive && f.distance < 1).length;
    const energyFactor = socialContext.socialEnergy / 100;
    const intensity = Math.min(100, (nearbyActiveCount * 30 + socialContext.activeFloqs * 20) * energyFactor);
    
    setPulseIntensity(intensity);
  }, [socialContext]);

  const getPulseColor = () => {
    if (pulseIntensity > 80) return 'hsl(280 70% 60%)'; // Hype - Purple
    if (pulseIntensity > 60) return 'hsl(200 80% 60%)'; // Social - Blue
    if (pulseIntensity > 40) return 'hsl(180 70% 60%)'; // Chill - Teal
    return 'hsl(240 50% 50%)'; // Low - Muted
  };

  const getActiveFriends = () => {
    return socialContext.nearbyFriends.filter(f => f.isActive && f.distance < 2);
  };

  if (pulseIntensity < 20) return null; // Only show when there's meaningful social activity

  return (
    <div className="fixed top-20 left-1/2 transform -translate-x-1/2 z-30">
      <div className="bg-card/90 backdrop-blur-xl rounded-2xl p-4 border border-border/30 glow-secondary animate-fade-in">
        <div className="flex items-center space-x-4">
          {/* Pulse Visual */}
          <div className="relative">
            <div 
              className="w-12 h-12 rounded-full animate-pulse-glow"
              style={{
                backgroundColor: getPulseColor(),
                boxShadow: `0 0 30px ${getPulseColor()}60`
              }}
            >
              <div className="absolute inset-2 rounded-full bg-background/20 flex items-center justify-center">
                <Zap className="w-4 h-4 text-white" />
              </div>
            </div>
            {/* Ripple rings */}
            <div 
              className="absolute inset-0 rounded-full border-2 animate-ping opacity-20"
              style={{ borderColor: getPulseColor() }}
            />
          </div>

          {/* Social Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-1">
              <Users className="w-4 h-4 text-primary" />
              <span className="text-sm font-medium text-foreground">
                {getActiveFriends().length} friends active
              </span>
            </div>
            
            <div className="flex items-center space-x-3 text-xs text-muted-foreground">
              <div className="flex items-center space-x-1">
                <Heart className="w-3 h-3" />
                <span>{socialContext.socialEnergy}% energy</span>
              </div>
              <div className="flex items-center space-x-1">
                <MapPin className="w-3 h-3" />
                <span>{socialContext.nearbyFriends.filter(f => f.distance < 0.5).length} nearby</span>
              </div>
            </div>
          </div>

          {/* Intensity Bar */}
          <div className="w-16 h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full transition-all duration-1000 ease-out rounded-full"
              style={{ 
                width: `${pulseIntensity}%`,
                backgroundColor: getPulseColor()
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};