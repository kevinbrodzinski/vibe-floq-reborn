import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Sparkles, MapPin, Clock, Heart } from 'lucide-react';
import { ResonanceMatch } from '@/hooks/useSerendipityEngine';
import { cn } from '@/lib/utils';

interface ResonanceMatchCardProps {
  match: ResonanceMatch;
  onConnect?: (partnerId: string) => void;
  onSkip?: (partnerId: string) => void;
  onViewProfile?: (partnerId: string) => void;
  className?: string;
}

export function ResonanceMatchCard({ 
  match, 
  onConnect, 
  onSkip, 
  onViewProfile,
  className 
}: ResonanceMatchCardProps) {
  const getScoreColor = (score: number) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-blue-600';
    if (score >= 40) return 'text-amber-600';
    return 'text-gray-600';
  };

  const getScoreGradient = (score: number) => {
    if (score >= 80) return 'from-emerald-500/20 to-emerald-600/20';
    if (score >= 60) return 'from-blue-500/20 to-blue-600/20';
    if (score >= 40) return 'from-amber-500/20 to-amber-600/20';
    return 'from-gray-500/20 to-gray-600/20';
  };

  return (
    <Card className={cn(
      "w-full max-w-md mx-auto relative overflow-hidden",
      "bg-gradient-to-br from-background to-secondary/10",
      "border-2 border-primary/20 hover:border-primary/40 transition-all duration-300",
      "shadow-lg hover:shadow-xl",
      className
    )}>
      {/* Background gradient */}
      <div className={cn(
        "absolute inset-0 bg-gradient-to-br opacity-50",
        getScoreGradient(match.resonanceScore)
      )} />
      
      <CardHeader className="relative pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="w-14 h-14 ring-2 ring-primary/20">
              <AvatarImage src="" alt="Partner" />
              <AvatarFallback className="bg-gradient-to-br from-primary/20 to-primary/30 text-primary">
                {match.partnerId.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            
            <div>
              <h3 className="font-semibold text-lg">Serendipity Match</h3>
              <p className="text-sm text-muted-foreground">Someone special nearby</p>
            </div>
          </div>
          
          <div className="flex flex-col items-end">
            <div className="flex items-center gap-1 mb-1">
              <Sparkles className="w-4 h-4 text-primary" />
              <span className={cn("font-bold text-xl", getScoreColor(match.resonanceScore))}>
                {Math.round(match.resonanceScore)}%
              </span>
            </div>
            <Badge variant="secondary" className="text-xs">
              Resonance Match
            </Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="relative space-y-4">
        {/* AI Insight */}
        <div className="bg-primary/5 rounded-lg p-3 border border-primary/10">
          <div className="flex items-start gap-2">
            <Sparkles className="w-4 h-4 text-primary mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-primary mb-1">AI Detected Perfect Resonance</p>
              <p className="text-xs text-muted-foreground">
                {match.reasoning.join(' • ')}
              </p>
            </div>
          </div>
        </div>

        {/* Compatibility Factors */}
        <div className="grid grid-cols-2 gap-2">
          <FactorBadge 
            label="Spatial" 
            value={match.factors.spatialResonance}
            icon="📍"
          />
          <FactorBadge 
            label="Temporal" 
            value={match.factors.temporalCompatibility}
            icon="⏰"
          />
          <FactorBadge 
            label="Social" 
            value={match.factors.socialChemistry}
            icon="👥"
          />
          <FactorBadge 
            label="Interests" 
            value={match.factors.sharedInterests}
            icon="💫"
          />
        </div>

        {/* Suggestion */}
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <Heart className="w-4 h-4 text-red-500" />
            <span className="font-medium">{match.suggestedActivity}</span>
          </div>
          
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{match.suggestedTime}</span>
            </div>
            <div className="flex items-center gap-1">
              <MapPin className="w-3 h-3" />
              <span>{match.suggestedLocation}</span>
            </div>
          </div>
        </div>
      </CardContent>

      <CardFooter className="relative flex gap-2 pt-4">
        <Button 
          variant="outline" 
          className="flex-1"
          onClick={() => onSkip?.(match.partnerId)}
        >
          Skip
        </Button>
        
        <Button 
          variant="outline" 
          className="flex-1"
          onClick={() => onViewProfile?.(match.partnerId)}
        >
          View Profile
        </Button>
        
        <Button 
          className="flex-1 bg-gradient-to-r from-primary to-primary-foreground"
          onClick={() => onConnect?.(match.partnerId)}
        >
          Connect
        </Button>
      </CardFooter>
    </Card>
  );
}

interface FactorBadgeProps {
  label: string;
  value: number;
  icon: string;
}

function FactorBadge({ label, value, icon }: FactorBadgeProps) {
  const getIntensity = (val: number) => {
    if (val >= 20) return 'bg-emerald-100 text-emerald-800 border-emerald-200';
    if (val >= 15) return 'bg-blue-100 text-blue-800 border-blue-200';
    if (val >= 10) return 'bg-amber-100 text-amber-800 border-amber-200';
    return 'bg-gray-100 text-gray-600 border-gray-200';
  };

  return (
    <div className={cn(
      "flex items-center gap-1 px-2 py-1 rounded-md border text-xs",
      getIntensity(value)
    )}>
      <span>{icon}</span>
      <span className="font-medium">{label}</span>
      <span className="ml-auto font-bold">{Math.round(value)}</span>
    </div>
  );
}

export default ResonanceMatchCard;