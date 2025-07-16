import React from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { 
  Heart,
  Pin,
  Calendar,
  Zap,
  Users,
  MapPin,
  Plus,
  Star,
  MoreVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { AfterglowSearchResult } from '@/lib/supabase-helpers';
import { format } from 'date-fns';

interface AfterglowCardProps {
  afterglow: AfterglowSearchResult;
  onFavorite: (id: string) => void;
  onAddToCollection: (id: string) => void;
  onViewDetails: (id: string) => void;
  isFavorited?: boolean;
}

export function AfterglowCard({
  afterglow,
  onFavorite,
  onAddToCollection,
  onViewDetails,
  isFavorited = false
}: AfterglowCardProps) {
  const getVibeColor = (vibe: string) => {
    const colors: Record<string, string> = {
      chill: 'bg-blue-100 text-blue-800',
      excited: 'bg-orange-100 text-orange-800',
      focused: 'bg-purple-100 text-purple-800',
      creative: 'bg-pink-100 text-pink-800',
      social: 'bg-green-100 text-green-800',
      contemplative: 'bg-indigo-100 text-indigo-800',
      energetic: 'bg-red-100 text-red-800',
      peaceful: 'bg-emerald-100 text-emerald-800',
      adventurous: 'bg-yellow-100 text-yellow-800',
      nostalgic: 'bg-purple-100 text-purple-800'
    };
    return colors[vibe] || 'bg-gray-100 text-gray-800';
  };

  const getEnergyColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    if (score >= 40) return 'text-orange-600';
    return 'text-red-600';
  };

  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardContent className="p-4 space-y-4">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium">
              {format(new Date(afterglow.date), 'MMM d, yyyy')}
            </span>
            {afterglow.is_pinned && (
              <Pin className="w-4 h-4 text-primary" />
            )}
          </div>
          
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreVertical className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => onViewDetails(afterglow.id)}>
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onFavorite(afterglow.id)}>
                <Heart className={`w-4 h-4 mr-2 ${isFavorited ? 'fill-current text-red-500' : ''}`} />
                {isFavorited ? 'Remove from Favorites' : 'Add to Favorites'}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onAddToCollection(afterglow.id)}>
                <Plus className="w-4 h-4 mr-2" />
                Add to Collection
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Summary */}
        {afterglow.summary_text && (
          <p className="text-sm text-muted-foreground line-clamp-3">
            {afterglow.summary_text}
          </p>
        )}

        {/* Metrics */}
        <div className="grid grid-cols-2 gap-4 py-2">
          <div className="flex items-center gap-2">
            <Zap className={`w-4 h-4 ${getEnergyColor(afterglow.energy_score)}`} />
            <span className="text-sm">
              Energy: <span className="font-medium">{afterglow.energy_score}/100</span>
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">
              Social: <span className="font-medium">{afterglow.social_intensity}/100</span>
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">
              {afterglow.total_venues} venues
            </span>
          </div>
          
          <div className="flex items-center gap-2">
            <Star className="w-4 h-4 text-muted-foreground" />
            <span className="text-sm">
              {afterglow.moments_count} moments
            </span>
          </div>
        </div>

        {/* Dominant Vibe & Tags */}
        <div className="space-y-2">
          {afterglow.dominant_vibe && (
            <Badge className={getVibeColor(afterglow.dominant_vibe)}>
              {afterglow.dominant_vibe}
            </Badge>
          )}
          
          {afterglow.vibe_path && afterglow.vibe_path.length > 1 && (
            <div className="flex flex-wrap gap-1">
              {afterglow.vibe_path.slice(0, 3).map((tag, index) => (
                <Badge key={index} variant="outline" className="text-xs">
                  {tag}
                </Badge>
              ))}
              {afterglow.vibe_path.length > 3 && (
                <Badge variant="outline" className="text-xs">
                  +{afterglow.vibe_path.length - 3} more
                </Badge>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-2 border-t">
          <span className="text-xs text-muted-foreground">
            {afterglow.crossed_paths_count} paths crossed
          </span>
          
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onViewDetails(afterglow.id)}
          >
            View Details
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}