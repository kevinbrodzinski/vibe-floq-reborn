import React from 'react';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Eye, Calendar, Clock, MapPin, Users, Trash2, User } from 'lucide-react';
import { useWatchlist } from '@/hooks/useWatchlist';
import { useNavigate } from 'react-router-dom';
import { getAvatarUrl, getInitials } from '@/lib/avatar';
import { formatDistanceToNow, format } from 'date-fns';
import { cn } from '@/lib/utils';

interface WatchlistSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const WatchlistSheet: React.FC<WatchlistSheetProps> = ({
  open,
  onOpenChange,
}) => {
  const navigate = useNavigate();
  const { 
    watchlist, 
    upcomingPlans, 
    pastPlans, 
    isLoading, 
    removeFromWatchlist, 
    isRemoving 
  } = useWatchlist();

  const handlePlanClick = (planId: string) => {
    navigate(`/plans/${planId}`);
    onOpenChange(false);
  };

  const handleRemoveFromWatchlist = (e: React.MouseEvent, planId: string) => {
    e.stopPropagation();
    removeFromWatchlist(planId);
  };

  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const isToday = date.toDateString() === now.toDateString();
    const isTomorrow = new Date(now.getTime() + 24 * 60 * 60 * 1000).toDateString() === date.toDateString();
    
    if (isToday) {
      return `Today at ${format(date, 'h:mm a')}`;
    } else if (isTomorrow) {
      return `Tomorrow at ${format(date, 'h:mm a')}`;
    } else {
      return format(date, 'MMM d, h:mm a');
    }
  };

  const getTimeStatus = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    if (diffHours < 0) {
      return { status: 'past', color: 'text-muted-foreground' };
    } else if (diffHours < 1) {
      return { status: 'soon', color: 'text-orange-500' };
    } else if (diffHours < 24) {
      return { status: 'today', color: 'text-blue-500' };
    } else {
      return { status: 'upcoming', color: 'text-green-500' };
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-md">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Eye className="w-5 h-5 text-blue-500" />
            My Watchlist
          </SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : watchlist.length === 0 ? (
            <div className="text-center py-8">
              <Eye className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-muted-foreground mb-2">
                No plans in watchlist
              </h3>
              <p className="text-sm text-muted-foreground">
                Add plans to your watchlist to track upcoming events
              </p>
            </div>
          ) : (
            <>
              {/* Upcoming Plans */}
              {upcomingPlans.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Upcoming ({upcomingPlans.length})
                  </h3>
                  <div className="space-y-3">
                    {upcomingPlans.map((item) => {
                      const timeStatus = getTimeStatus(item.plan.starts_at);
                      return (
                        <div
                          key={item.id}
                          className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors cursor-pointer group"
                          onClick={() => handlePlanClick(item.plan.id)}
                        >
                          <div className="flex-shrink-0">
                            {item.plan.image_url ? (
                              <img
                                src={item.plan.image_url}
                                alt={item.plan.title}
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
                              {item.plan.title}
                            </h4>
                            {item.plan.description && (
                              <p className="text-xs text-muted-foreground truncate">
                                {item.plan.description}
                              </p>
                            )}
                            <div className="flex items-center gap-2 mt-1">
                              <Avatar className="w-4 h-4">
                                <AvatarImage src={getAvatarUrl(item.plan.creator.avatar_url, 16)} />
                                <AvatarFallback className="text-xs">
                                  {getInitials(item.plan.creator.display_name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs text-muted-foreground">
                                by {item.plan.creator.display_name}
                              </span>
                            </div>
                            <p className={cn("text-xs font-medium mt-1", timeStatus.color)}>
                              {formatTime(item.plan.starts_at)}
                            </p>
                          </div>

                          <div className="flex items-center gap-1">
                            <Badge 
                              variant={timeStatus.status === 'soon' ? 'destructive' : 'secondary'} 
                              className="text-xs"
                            >
                              {timeStatus.status === 'soon' ? 'Soon' : 'Upcoming'}
                            </Badge>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => handleRemoveFromWatchlist(e, item.plan.id)}
                              disabled={isRemoving}
                              className="opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                              <Trash2 className="w-4 h-4 text-muted-foreground hover:text-destructive" />
                            </Button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Past Plans */}
              {pastPlans.length > 0 && (
                <div>
                  <h3 className="text-sm font-medium text-muted-foreground mb-3 flex items-center gap-2">
                    <Clock className="w-4 h-4" />
                    Past Events ({pastPlans.length})
                  </h3>
                  <div className="space-y-3">
                    {pastPlans.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 p-3 rounded-lg border border-border/50 hover:bg-muted/50 transition-colors cursor-pointer group opacity-60"
                        onClick={() => handlePlanClick(item.plan.id)}
                      >
                        <div className="flex-shrink-0">
                          {item.plan.image_url ? (
                            <img
                              src={item.plan.image_url}
                              alt={item.plan.title}
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
                            {item.plan.title}
                          </h4>
                          {item.plan.description && (
                            <p className="text-xs text-muted-foreground truncate">
                              {item.plan.description}
                            </p>
                          )}
                          <div className="flex items-center gap-2 mt-1">
                            <Avatar className="w-4 h-4">
                              <AvatarImage src={getAvatarUrl(item.plan.creator.avatar_url, 16)} />
                              <AvatarFallback className="text-xs">
                                {getInitials(item.plan.creator.display_name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-xs text-muted-foreground">
                              by {item.plan.creator.display_name}
                            </span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {formatTime(item.plan.starts_at)}
                          </p>
                        </div>

                        <div className="flex items-center gap-1">
                          <Badge variant="outline" className="text-xs">
                            Past
                          </Badge>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => handleRemoveFromWatchlist(e, item.plan.id)}
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