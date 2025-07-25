import { Heart, Star, Users, Clock, MapPin, Quote } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

interface AfterglowData {
  id: string;
  plan_title: string;
  date: string;
  overall_rating: number;
  energy_level: number;
  social_connection: number;
  would_repeat_score: number;
  overall_vibe: string;
  moments: {
    best?: string;
    discovery?: string;
    quote?: string;
    photo_worthy?: string;
    moment_types?: string[];
  };
  participants?: Array<{
    id: string;
    display_name: string;
    avatar_url?: string;
  }>;
  group_chemistry: number;
  final_thoughts?: string;
}

interface AfterglowSummaryCardProps {
  afterglow: AfterglowData;
  onShare?: () => void;
  className?: string;
}

export const AfterglowSummaryCard = ({
  afterglow,
  onShare,
  className = ""
}: AfterglowSummaryCardProps) => {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const getRatingColor = (rating: number) => {
    if (rating >= 8) return "text-green-500";
    if (rating >= 6) return "text-yellow-500";
    return "text-orange-500";
  };

  const getRatingEmoji = (rating: number) => {
    if (rating >= 9) return "🔥";
    if (rating >= 7) return "✨";
    if (rating >= 5) return "😊";
    return "🤔";
  };

  return (
    <Card className={`overflow-hidden ${className}`}>
      {/* Header with gradient */}
      <div className="bg-gradient-to-r from-purple-500 to-pink-500 p-6 text-white">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Heart className="w-5 h-5" />
              <h3 className="text-lg font-semibold">Ripple</h3>
            </div>
            <h2 className="text-xl font-bold mb-1">{afterglow.plan_title}</h2>
            <p className="text-purple-100 text-sm">
              {formatDate(afterglow.date)}
            </p>
          </div>
          
          <div className="text-center">
            <div className="text-2xl mb-1">{afterglow.overall_vibe || "✨"}</div>
            <div className="text-sm text-purple-100">Overall vibe</div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Ratings Grid */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="text-center">
            <div className={`text-2xl font-bold ${getRatingColor(afterglow.overall_rating)} animate-pulse`}>
              {afterglow.overall_rating}/10
            </div>
            <div className="text-xs text-muted-foreground">Overall</div>
            <div className="text-lg animate-bounce">{getRatingEmoji(afterglow.overall_rating)}</div>
          </div>
          
          <div className="text-center">
            <div className={`text-2xl font-bold ${getRatingColor(afterglow.energy_level)}`}>
              {afterglow.energy_level}/10
            </div>
            <div className="text-xs text-muted-foreground">Energy</div>
            <div className="text-lg">⚡</div>
          </div>
          
          <div className="text-center">
            <div className={`text-2xl font-bold ${getRatingColor(afterglow.social_connection)}`}>
              {afterglow.social_connection}/10
            </div>
            <div className="text-xs text-muted-foreground">Social</div>
            <div className="text-lg">🤝</div>
          </div>
          
          <div className="text-center">
            <div className={`text-2xl font-bold ${getRatingColor(afterglow.would_repeat_score)}`}>
              {afterglow.would_repeat_score}/10
            </div>
            <div className="text-xs text-muted-foreground">Repeat?</div>
            <div className="text-lg">🔄</div>
          </div>
        </div>

        {/* Moment Types */}
        {afterglow.moments?.moment_types && afterglow.moments.moment_types.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Star className="w-4 h-4" />
              Moment Types
            </h4>
            <div className="flex flex-wrap gap-2">
              {afterglow.moments.moment_types.map((moment, index) => (
                <Badge key={index} variant="secondary" className="text-xs">
                  {moment.replace('_', ' ')}
                </Badge>
              ))}
            </div>
          </div>
        )}

        {/* Best Moment */}
        {afterglow.moments?.best && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Star className="w-4 h-4 text-yellow-500" />
              Best Moment
            </h4>
            <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              "{afterglow.moments.best}"
            </p>
          </div>
        )}

        {/* Quote */}
        {afterglow.moments?.quote && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Quote className="w-4 h-4" />
              Quote of the Night
            </h4>
            <p className="text-sm italic text-muted-foreground bg-muted/50 p-3 rounded-lg">
              "{afterglow.moments.quote}"
            </p>
          </div>
        )}

        {/* New Discovery */}
        {afterglow.moments?.discovery && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-500" />
              New Discovery
            </h4>
            <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              {afterglow.moments.discovery}
            </p>
          </div>
        )}

        {/* Participants */}
        {afterglow.participants && afterglow.participants.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Users className="w-4 h-4" />
              The Crew ({afterglow.participants.length})
            </h4>
            <div className="flex flex-wrap gap-2">
              {afterglow.participants.map((participant) => (
                <div
                  key={participant.id}
                  className="flex items-center gap-2 bg-muted/50 rounded-full px-3 py-1"
                >
                  <Avatar className="w-5 h-5">
                    <AvatarImage src={participant.avatar_url} />
                    <AvatarFallback className="text-xs">
                      {participant.display_name.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <span className="text-xs">{participant.display_name}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Group Chemistry */}
        <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
          <span className="text-sm font-medium">Group Chemistry</span>
          <div className="flex items-center gap-2">
            <span className={`font-bold ${getRatingColor(afterglow.group_chemistry)}`}>
              {afterglow.group_chemistry}/10
            </span>
            <span className="text-lg">🔥</span>
          </div>
        </div>

        {/* Final Thoughts */}
        {afterglow.final_thoughts && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Heart className="w-4 h-4 text-pink-500" />
              Final Reflections
            </h4>
            <p className="text-sm text-muted-foreground bg-muted/50 p-3 rounded-lg">
              {afterglow.final_thoughts}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <Clock className="w-3 h-3" />
            <span>Captured {formatDate(afterglow.date)}</span>
          </div>
          
          {onShare && (
            <button
              onClick={onShare}
              className="text-xs text-primary hover:text-primary/80 font-medium"
            >
              Share this memory →
            </button>
          )}
        </div>
      </div>
    </Card>
  );
};