import React, { useMemo, useRef, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Heart, X, MapPin, Star } from 'lucide-react';

type VenueCard = {
  id: string;
  name: string;
  photo_url?: string;
  vibe_score?: number;
  price_level?: number | null;
  reasons?: string[];
  distance_m?: number;
  category?: string;
};

type Props = {
  items: VenueCard[];
  onAccept: (v: VenueCard) => void;
  onReject: (v: VenueCard) => void;
  onExhausted?: () => void;
  className?: string;
};

export function SwipeDeck({ items, onAccept, onReject, onExhausted, className }: Props) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const stackRef = useRef<HTMLDivElement>(null);

  const currentCard = useMemo(() => items[currentIndex], [items, currentIndex]);

  const handleAccept = () => {
    if (currentCard) {
      onAccept(currentCard);
      nextCard();
    }
  };

  const handleReject = () => {
    if (currentCard) {
      onReject(currentCard);
      nextCard();
    }
  };

  const nextCard = () => {
    if (currentIndex >= items.length - 1) {
      onExhausted?.();
    } else {
      setCurrentIndex(prev => prev + 1);
    }
  };

  if (!currentCard) {
    return (
      <Card className={`h-[400px] flex items-center justify-center ${className}`}>
        <CardContent className="text-center">
          <MapPin className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
          <p className="text-lg font-medium">No more venues</p>
          <p className="text-sm text-muted-foreground">All options have been reviewed</p>
        </CardContent>
      </Card>
    );
  }

  const priceDisplay = currentCard.price_level ? '$'.repeat(currentCard.price_level) : '$$';
  const vibeScore = Math.round(currentCard.vibe_score || 50);

  return (
    <Card className={`h-[400px] overflow-hidden ${className}`} ref={stackRef}>
      <div className="relative h-full">
        {/* Image or placeholder */}
        <div className="h-48 bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center">
          {currentCard.photo_url ? (
            <img 
              src={currentCard.photo_url} 
              alt={currentCard.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <MapPin className="w-16 h-16 text-primary/40" />
          )}
        </div>

        <CardContent className="p-4 space-y-3">
          {/* Header */}
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <h3 className="font-semibold text-lg leading-tight">{currentCard.name}</h3>
              <div className="flex items-center gap-2 mt-1">
                <Badge variant="secondary" className="text-xs">
                  {priceDisplay}
                </Badge>
                {currentCard.distance_m && (
                  <span className="text-sm text-muted-foreground">
                    {currentCard.distance_m}m away
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-1">
              <Star className="w-4 h-4 text-yellow-500 fill-current" />
              <span className="text-sm font-medium">{vibeScore}</span>
            </div>
          </div>

          {/* Reasons */}
          {currentCard.reasons && currentCard.reasons.length > 0 && (
            <div className="space-y-1">
              {currentCard.reasons.slice(0, 2).map((reason, index) => (
                <p key={index} className="text-sm text-muted-foreground">
                  • {reason}
                </p>
              ))}
            </div>
          )}

          {/* Action buttons */}
          <div className="flex gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleReject}
              className="flex-1 flex items-center gap-2 border-destructive/20 hover:bg-destructive/10"
            >
              <X className="w-4 h-4" />
              Pass
            </Button>
            <Button
              size="sm"
              onClick={handleAccept}
              className="flex-1 flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              <Heart className="w-4 h-4" />
              Add
            </Button>
          </div>

          {/* Progress indicator */}
          <div className="text-center text-xs text-muted-foreground">
            {currentIndex + 1} of {items.length}
          </div>
        </CardContent>
      </div>
    </Card>
  );
}