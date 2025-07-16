import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarImage, AvatarFallback } from '@/components/ui/avatar';
import { Star, Quote } from 'lucide-react';
import { getVibeColor } from '@/hooks/useUserPreferences';

export interface PlanFeedback {
  id: string;
  user_id: string;
  user_display_name: string;
  user_avatar_url?: string;
  vibe_rating?: number;
  favorite_moment?: string;
  would_repeat?: boolean;
  created_at: string;
  vibe?: string;
}

interface PlanReflectionCardProps {
  reflection: PlanFeedback;
}

function getVibeColorClasses(vibe?: string): string {
  switch (vibe) {
    case 'chill': return 'bg-blue-50 border-blue-200 text-blue-800';
    case 'energetic': return 'bg-yellow-50 border-yellow-200 text-yellow-800';
    case 'romantic': return 'bg-pink-50 border-pink-200 text-pink-800';
    case 'wild': return 'bg-purple-50 border-purple-200 text-purple-800';
    case 'cozy': return 'bg-rose-50 border-rose-200 text-rose-800';
    case 'deep': return 'bg-teal-50 border-teal-200 text-teal-800';
    default: return 'bg-muted border-muted-foreground/20 text-muted-foreground';
  }
}

function getAvatarVibeStyle(vibe?: string): React.CSSProperties {
  const color = getVibeColor(vibe || 'neutral');
  return {
    borderColor: color,
    boxShadow: `0 0 0.5rem ${color}40`,
  };
}

export function PlanReflectionCard({ reflection }: PlanReflectionCardProps) {
  const vibeColorClasses = getVibeColorClasses(reflection.vibe);
  const avatarStyle = getAvatarVibeStyle(reflection.vibe);

  return (
    <Card className="p-4 animate-fade-in hover-scale transition-all duration-300">
      <div className="flex items-start gap-3">
        {/* Avatar with vibe glow */}
        <Avatar className="w-10 h-10 border-2" style={avatarStyle}>
          <AvatarImage src={reflection.user_avatar_url} />
          <AvatarFallback className="text-sm font-medium">
            {reflection.user_display_name?.charAt(0)?.toUpperCase() || '?'}
          </AvatarFallback>
        </Avatar>

        <div className="flex-1 space-y-2">
          {/* Header with name and vibe */}
          <div className="flex items-center justify-between">
            <span className="font-medium text-foreground">
              {reflection.user_display_name}
            </span>
            
            {reflection.vibe && (
              <Badge variant="outline" className={vibeColorClasses}>
                {reflection.vibe}
              </Badge>
            )}
          </div>

          {/* Rating */}
          {reflection.vibe_rating && (
            <div className="flex items-center gap-1">
              {Array.from({ length: 5 }, (_, i) => (
                <Star
                  key={i}
                  className={`w-3 h-3 ${
                    i < reflection.vibe_rating! 
                      ? 'fill-yellow-400 text-yellow-400' 
                      : 'text-muted-foreground/30'
                  }`}
                />
              ))}
              <span className="text-xs text-muted-foreground ml-1">
                {reflection.vibe_rating}/5
              </span>
            </div>
          )}

          {/* Favorite moment */}
          {reflection.favorite_moment && (
            <div className="relative">
              <Quote className="w-3 h-3 text-muted-foreground/60 absolute -top-1 -left-1" />
              <p className="text-sm text-muted-foreground italic pl-3 leading-relaxed">
                {reflection.favorite_moment.replace(/'/g, "'")} {/* Safe quote handling */}
              </p>
            </div>
          )}

          {/* Would repeat indicator */}
          {reflection.would_repeat && (
            <div className="text-xs text-green-600 font-medium">
              ✓ Would do again
            </div>
          )}
        </div>
      </div>
    </Card>
  );
}