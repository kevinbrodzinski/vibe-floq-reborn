import React, { useState } from 'react';
import { 
  MapPin, 
  Search, 
  Clock, 
  Users, 
  Star, 
  Filter,
  Sparkles,
  Zap,
  ChevronRight
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { Card } from '@/components/ui/card';
import { useSmartDiscovery, type DiscoveryFilters, type SmartRecommendation } from '@/hooks/useSmartDiscovery';
import { useRecommendationActions } from '@/hooks/useRecommendationActions';
import { useFloqJoin } from '@/hooks/useFloqJoin';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';
import { useGeo } from '@/hooks/useGeo';

interface ProfileSmartDiscoveryProps {
  className?: string;
}

const vibeOptions = [
  { value: 'chill', label: 'Chill', icon: '🌿' },
  { value: 'social', label: 'Social', icon: '👥' },
  { value: 'hype', label: 'Hype', icon: '🔥' },
  { value: 'romantic', label: 'Romantic', icon: '💕' },
  { value: 'curious', label: 'Curious', icon: '🔍' },
  { value: 'flowing', label: 'Flowing', icon: '🌊' }
];

const activityTypes = [
  { value: 'food', label: 'Food & Drink', icon: '🍽️' },
  { value: 'entertainment', label: 'Entertainment', icon: '🎭' },
  { value: 'outdoor', label: 'Outdoor', icon: '🌳' },
  { value: 'wellness', label: 'Wellness', icon: '🧘' },
  { value: 'culture', label: 'Culture', icon: '🎨' },
  { value: 'nightlife', label: 'Nightlife', icon: '🌙' }
];

export const ProfileSmartDiscovery: React.FC<ProfileSmartDiscoveryProps> = ({
  className
}) => {
  const navigate = useNavigate();
  const { coords } = useGeo();
  const lat = coords?.lat;
  const lng = coords?.lng;
  const [filters, setFilters] = useState<DiscoveryFilters>({
    radius: 2,
    vibe: 'social',
    activityType: 'food',
    timeOfDay: 'afternoon',
    groupSize: 2,
    budget: 'moderate',
    duration: 'medium'
  });
  
  const [isExpanded, setIsExpanded] = useState(false);
  const { handleAction } = useRecommendationActions();
  const { join } = useFloqJoin();

  // Use real data hook
  const { 
    data: recommendations = [], 
    isLoading, 
    error, 
    refetch 
  } = useSmartDiscovery(lat && lng ? { lat, lng } : null, filters);

  const handleFilterChange = (key: keyof DiscoveryFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleItemAction = async (action: string, itemId: string) => {
    const item = recommendations.find(rec => rec.id === itemId);
    if (!item) return;

    try {
      switch (action) {
        case 'join':
          if (item.type === 'floq') {
            await join({ floqId: itemId });
            toast.success(`Joined ${item.title}!`);
          } else {
            navigate(`/venues/${itemId}`);
          }
          break;
        
        case 'visit':
          if (item.type === 'venue') {
            navigate(`/venues/${itemId}`);
          } else {
            navigate(`/floqs/${itemId}`);
          }
          break;
        
        case 'rsvp':
          if (item.type === 'floq') {
            await join({ floqId: itemId });
            toast.success(`RSVP'd to ${item.title}!`);
          }
          break;
        
        case 'favorite':
          handleAction(action, itemId, item);
          toast.success(`Added ${item.title} to favorites!`);
          break;
        
        case 'watch':
          handleAction(action, itemId, item);
          toast.success(`Added ${item.title} to watch list!`);
          break;
        
        case 'share':
          if (navigator.share) {
            await navigator.share({
              title: item.title,
              text: `Check out this ${item.type}: ${item.title}`,
              url: `${window.location.origin}/${item.type}s/${itemId}`
            });
          } else {
            await navigator.clipboard.writeText(
              `${window.location.origin}/${item.type}s/${itemId}`
            );
            toast.success('Link copied to clipboard!');
          }
          break;
        
        default:
          handleAction(action, itemId, item);
      }
    } catch (error) {
      console.error('Action failed:', error);
      toast.error('Action failed. Please try again.');
    }
  };

  const generateRecommendations = async () => {
    await refetch();
  };

  return (
    <Card className={cn("border-border/30 bg-card/50 backdrop-blur-sm", className)}>
      <div className="p-4">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-full bg-primary/20 flex items-center justify-center">
              <MapPin className="w-3 h-3 text-primary" />
            </div>
            <h3 className="text-sm font-medium text-foreground">Smart Discovery</h3>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(!isExpanded)}
            className="h-6 w-6 p-0"
          >
            <ChevronRight className={cn("w-3 h-3 transition-transform", isExpanded && "rotate-90")} />
          </Button>
        </div>

        {isExpanded ? (
          <div className="space-y-4">
            {/* Quick Filters */}
            <div className="space-y-3">
              {/* Vibe Selection */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Vibe
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {vibeOptions.map((vibe) => (
                    <button
                      key={vibe.value}
                      onClick={() => handleFilterChange('vibe', vibe.value)}
                      className={cn(
                        "p-2 rounded-md border transition-all text-xs",
                        filters.vibe === vibe.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/50 hover:border-primary/30"
                      )}
                    >
                      <div className="text-sm mb-1">{vibe.icon}</div>
                      {vibe.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Activity Type */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Activity
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {activityTypes.map((activity) => (
                    <button
                      key={activity.value}
                      onClick={() => handleFilterChange('activityType', activity.value)}
                      className={cn(
                        "p-2 rounded-md border transition-all text-xs",
                        filters.activityType === activity.value
                          ? "border-primary bg-primary/10 text-primary"
                          : "border-border/50 hover:border-primary/30"
                      )}
                    >
                      <div className="text-sm mb-1">{activity.icon}</div>
                      {activity.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Radius Slider */}
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-2 block">
                  Radius: {filters.radius}km
                </label>
                <Slider
                  value={[filters.radius]}
                  onValueChange={(value) => handleFilterChange('radius', value[0])}
                  max={5}
                  min={0.5}
                  step={0.5}
                  className="w-full"
                />
              </div>
            </div>

            {/* Generate Button */}
            <Button
              onClick={generateRecommendations}
              disabled={isLoading}
              size="sm"
              className="w-full"
            >
              {isLoading ? (
                <>
                  <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin mr-2" />
                  Finding matches...
                </>
              ) : (
                <>
                  <Zap className="w-3 h-3 mr-2" />
                  Discover Now
                </>
              )}
            </Button>

            {/* Results */}
            {error ? (
              <div className="text-center py-4">
                <p className="text-xs text-muted-foreground">Something went wrong</p>
                <Button 
                  onClick={() => refetch()} 
                  size="sm"
                  variant="outline"
                  className="mt-2"
                >
                  Try Again
                </Button>
              </div>
            ) : recommendations.length > 0 ? (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">
                    {recommendations.length} matches found
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    AI Powered ✨
                  </Badge>
                </div>
                
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {recommendations.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-lg border border-border/30 bg-card/30 hover:bg-card/50 transition-colors cursor-pointer"
                      onClick={() => handleItemAction('visit', item.id)}
                    >
                      <div className="flex items-start justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-medium truncate">
                              {item.title}
                            </span>
                            <Badge variant="outline" className="text-xs px-1 py-0">
                              {item.type}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground line-clamp-1">
                            {item.description}
                          </p>
                          <div className="flex items-center gap-2 mt-1">
                            <span className="text-xs text-muted-foreground">
                              {(item.distance / 1000).toFixed(1)}km
                            </span>
                            {item.rating && (
                              <div className="flex items-center gap-1">
                                <Star className="w-3 h-3 text-yellow-500 fill-current" />
                                <span className="text-xs text-muted-foreground">
                                  {item.rating}
                                </span>
                              </div>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleItemAction('favorite', item.id);
                            }}
                            className="h-6 w-6 p-0"
                          >
                            <Star className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                {recommendations.length > 3 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full text-xs"
                    onClick={() => navigate('/pulse')}
                  >
                    View all {recommendations.length} recommendations
                  </Button>
                )}
              </div>
            ) : !isLoading && (
              <div className="text-center py-4">
                <p className="text-xs text-muted-foreground">No matches found</p>
                <p className="text-xs text-muted-foreground mt-1">
                  Try adjusting your preferences
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-2">
            <p className="text-xs text-muted-foreground">
              Find perfect places around you
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsExpanded(true)}
              className="mt-2 text-xs"
            >
              <Sparkles className="w-3 h-3 mr-1" />
              Start Discovery
            </Button>
          </div>
        )}
      </div>
    </Card>
  );
}; 