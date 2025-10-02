import { useState } from 'react';
import { GlassCard } from '../shared/GlassCard';
import { AuroraBackground } from '../shared/AuroraBackground';
import { Shield, Eye, Users, Lock, Check } from 'lucide-react';

const PRIVACY_TIERS = [
  {
    id: 'friends',
    label: 'Friends Only',
    icon: Users,
    description: 'Only friends can see your location',
    details: 'Your data stays private within your circle',
  },
  {
    id: 'smart',
    label: 'Smart Privacy',
    icon: Eye,
    description: 'Anonymous contribution to the Field',
    details: 'Help others without revealing your identity',
    recommended: true,
  },
  {
    id: 'ghost',
    label: 'Ghost Mode',
    icon: Lock,
    description: 'Completely invisible',
    details: 'See everything, share nothing',
  },
];

/**
 * Privacy Screen - Trust-building with granular controls
 * Three-tier system with clear visual feedback
 */
export function PrivacyScreen() {
  const [selected, setSelected] = useState<string>('smart');

  return (
    <div className="relative min-h-screen p-6">
      <AuroraBackground />
      
      <div className="relative z-10 max-w-md mx-auto space-y-6">
        <div className="text-center mb-8 animate-fade-in">
          <div className="flex justify-center mb-4">
            <div className="h-12 w-12 rounded-full bg-green-500/10 flex items-center justify-center">
              <Shield className="h-6 w-6 text-green-500" />
            </div>
          </div>
          <h2 className="text-2xl font-bold mb-2">Your Privacy, Your Rules</h2>
          <p className="text-sm text-muted-foreground">
            Choose how you want to appear on the Field
          </p>
        </div>

        {/* Privacy tiers */}
        <div className="space-y-3">
          {PRIVACY_TIERS.map((tier, i) => {
            const Icon = tier.icon;
            const isSelected = selected === tier.id;
            
            return (
              <GlassCard 
                key={tier.id}
                variant={isSelected ? 'elevated' : 'default'}
                className={`
                  cursor-pointer transition-all hover:scale-102
                  ${isSelected ? 'border-primary bg-primary/5' : ''}
                `}
                style={{ animationDelay: `${i * 100}ms` }}
              >
                <button 
                  onClick={() => setSelected(tier.id)}
                  className="w-full text-left"
                >
                  <div className="flex items-start gap-4">
                    <div className={`
                      h-12 w-12 rounded-full flex items-center justify-center flex-shrink-0
                      ${isSelected ? 'bg-primary/20' : 'bg-background/40'}
                    `}>
                      <Icon className={`h-6 w-6 ${isSelected ? 'text-primary' : 'text-muted-foreground'}`} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-medium">{tier.label}</span>
                        {tier.recommended && (
                          <span className="text-xs px-2 py-0.5 bg-green-500/10 text-green-500 border border-green-500/20 rounded-full">
                            Recommended
                          </span>
                        )}
                        {isSelected && (
                          <Check className="h-4 w-4 text-primary ml-auto" />
                        )}
                      </div>
                      <div className="text-sm text-muted-foreground mb-2">
                        {tier.description}
                      </div>
                      <div className="text-xs text-muted-foreground/70">
                        {tier.details}
                      </div>
                    </div>
                  </div>
                </button>
              </GlassCard>
            );
          })}
        </div>

        {/* Trust indicator */}
        <GlassCard variant="subtle" className="flex items-center gap-3">
          <div className="h-8 w-8 rounded-full bg-green-500/10 flex items-center justify-center flex-shrink-0">
            <Check className="h-4 w-4 text-green-500" />
          </div>
          <div className="text-xs text-muted-foreground">
            Your location data is encrypted and never sold. You can change this anytime.
          </div>
        </GlassCard>
      </div>
    </div>
  );
}
