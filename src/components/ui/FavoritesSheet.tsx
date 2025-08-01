import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Heart, MapPin, Calendar, Clock, ExternalLink, Trash2 } from 'lucide-react';
import { useFavorites } from '@/hooks/useFavorites';
import { useNavigate } from 'react-router-dom';
import { getAvatarUrl, getInitials } from '@/lib/avatar';
import { formatDistanceToNow } from 'date-fns';
import { cn } from '@/lib/utils';

interface FavoritesSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const FavoritesSheet: React.FC<FavoritesSheetProps> = ({
  open,
  onOpenChange,
}) => {
  const navigate = useNavigate();
  const { favorites, isLoading, removeFavorite, isRemoving } = useFavorites();

  const handleItemClick = (item: any) => {
    if (item.item_type === 'venue') {
      navigate(`/venues/${item.item_id}`);
    } else if (item.item_type === 'plan') {
      navigate(`/plans/${item.item_id}`);
    }
    onOpenChange(false);
  };

  const handleRemoveFavorite = (e: React.MouseEvent, itemId: string) => {
    e.stopPropagation();
    removeFavorite(itemId);
  };

  const venueFavorites = favorites.filter(fav => fav.item_type === 'venue');
  const planFavorites = favorites.filter(fav => fav.item_type === 'plan');

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Heart className="w-5 h-5 text-red-500" />
            My Favorites
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : favorites.length === 0 ? (
            <div className="text-center py-8">
              <Heart className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                No favorites yet
              </h3>
              <p className="text-sm text-muted-foreground">
                Start exploring venues and plans to add them to your favorites
              </p>
            </div>
          ) : (
            <>
              {/* Venue Favorites */}
              {venueFavorites.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <MapPin className="w-4 h-4" />
                    Venues ({venueFavorites.length})
                  </h3>
                  <div className="space-y-3">
                     {venueFavorites.map((item) => (
                       <div
                         key={item.item_id}
                         className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors cursor-pointer group"
                        onClick={() => handleItemClick(item)}
                      >
                        <div className="flex-shrink-0">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.title}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                              <MapPin className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">
                            {item.title}
                          </h4>
                          {item.description && (
                            <p className="text-xs text-muted-foreground truncate">
                              {item.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Added {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          <Badge variant="secondary" className="text-xs">
                            Venue
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleRemoveFavorite(e, item.item_id)}
                            disabled={isRemoving}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Plan Favorites */}
              {planFavorites.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <Calendar className="w-4 h-4" />
                    Plans ({planFavorites.length})
                  </h3>
                  <div className="space-y-3">
                     {planFavorites.map((item) => (
                       <div
                         key={item.item_id}
                         className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors cursor-pointer group"
                        onClick={() => handleItemClick(item)}
                      >
                        <div className="flex-shrink-0">
                          {item.image_url ? (
                            <img
                              src={item.image_url}
                              alt={item.title}
                              className="w-12 h-12 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="w-12 h-12 rounded-lg bg-muted flex items-center justify-center">
                              <Calendar className="w-6 h-6 text-muted-foreground" />
                            </div>
                          )}
                        </div>
                        
                        <div className="flex-1 min-w-0">
                          <h4 className="font-medium text-sm truncate">
                            {item.title}
                          </h4>
                          {item.description && (
                            <p className="text-xs text-muted-foreground truncate">
                              {item.description}
                            </p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            Added {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          <Badge variant="secondary" className="text-xs">
                            Plan
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleRemoveFavorite(e, item.item_id)}
                            disabled={isRemoving}
                            className="opacity-0 group-hover:opacity-100 transition-opacity"
                          >
                            <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </SheetContent>
    </Sheet>
  );
}; 