import React, { useState, useEffect } from 'react';
import { 
  MapPin, 
  X, 
  Search, 
  Clock, 
  Users, 
  Star, 
  Filter,
  Sparkles,
  TrendingUp,
  Heart,
  Share2,
  Sliders,
  Target,
  Zap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Slider } from '@/components/ui/slider';
import { EnhancedRecommendationCard } from './EnhancedRecommendationCard';
import { useRecommendationActions } from '@/hooks/useRecommendationActions';
import { useSmartDiscovery, type DiscoveryFilters, type SmartRecommendation } from '@/hooks/useSmartDiscovery';
import { useFloqJoin } from '@/hooks/useFloqJoin';
import { useVenueInteractions } from '@/hooks/useVenueInteractions';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import { toast } from 'sonner';

interface SmartDiscoveryModalProps {
  isOpen: boolean;
  onClose: () => void;
  userLocation?: { lat: number; lng: number };
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

const timeOptions = [
  { value: 'morning', label: 'Morning', icon: '🌅' },
  { value: 'afternoon', label: 'Afternoon', icon: '☀️' },
  { value: 'evening', label: 'Evening', icon: '🌆' },
  { value: 'night', label: 'Night', icon: '🌃' }
];

const budgetOptions = [
  { value: 'free', label: 'Free' },
  { value: 'budget', label: 'Budget' },
  { value: 'moderate', label: 'Moderate' },
  { value: 'premium', label: 'Premium' }
];

const durationOptions = [
  { value: 'quick', label: 'Quick (< 1 hour)' },
  { value: 'short', label: 'Short (1-2 hours)' },
  { value: 'medium', label: 'Medium (2-4 hours)' },
  { value: 'long', label: 'Long (4+ hours)' }
];

export const SmartDiscoveryModal: React.FC<SmartDiscoveryModalProps> = ({
  isOpen,
  onClose,
  userLocation
}) => {
  const navigate = useNavigate();
  const [filters, setFilters] = useState<DiscoveryFilters>({
    radius: 2,
    vibe: 'social',
    activityType: 'food',
    timeOfDay: 'afternoon',
    groupSize: 2,
    budget: 'moderate',
    duration: 'medium'
  });
  
  const [activeTab, setActiveTab] = useState<'filters' | 'results'>('filters');
  const { handleAction } = useRecommendationActions();
  const { join, isPending } = useFloqJoin();
  const { view, favorite, share } = useVenueInteractions();

  // Use real data hook
  const { 
    data: recommendations = [], 
    isLoading, 
    error, 
    refetch 
  } = useSmartDiscovery(userLocation || null, filters);

  useEffect(() => {
    if (isOpen && userLocation) {
      setActiveTab('results');
    }
  }, [isOpen, userLocation]);

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
            // For venues, navigate to venue details
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
          if (item.type === 'venue') {
            favorite(itemId);
          } else {
            handleAction(action, itemId, item);
          }
          toast.success(`Added ${item.title} to favorites!`);
          break;
        
        case 'watch':
          handleAction(action, itemId, item);
          toast.success(`Added ${item.title} to watch list!`);
          break;
        
        case 'share':
          if (item.type === 'venue') {
            share(itemId);
          }
          if (navigator.share) {
            await navigator.share({
              title: item.title,
              text: `Check out this ${item.type}: ${item.title}`,
              url: `${window.location.origin}/${item.type}s/${itemId}`
            });
          } else {
            // Fallback to clipboard
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
    setActiveTab('results');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm">
      <div className="w-full max-w-4xl max-h-[90vh] bg-card/95 backdrop-blur-xl rounded-3xl border border-border/30 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-border/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center">
              <MapPin className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground">Smart Discovery</h2>
              <p className="text-sm text-muted-foreground">Find perfect places around you</p>
            </div>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={onClose}
            className="w-8 h-8 p-0"
          >
            <X className="w-4 h-4" />
          </Button>
        </div>

        {/* Tab Navigation */}
        <div className="flex border-b border-border/30">
          <button
            onClick={() => setActiveTab('filters')}
            className={cn(
              "flex-1 py-3 px-4 text-sm font-medium transition-colors",
              activeTab === 'filters' 
                ? "text-primary border-b-2 border-primary" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Sliders className="w-4 h-4 inline mr-2" />
            Filters
          </button>
          <button
            onClick={() => setActiveTab('results')}
            className={cn(
              "flex-1 py-3 px-4 text-sm font-medium transition-colors",
              activeTab === 'results' 
                ? "text-primary border-b-2 border-primary" 
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            <Sparkles className="w-4 h-4 inline mr-2" />
            Results ({recommendations.length})
          </button>
        </div>

        <div className="overflow-y-auto max-h-[calc(90vh-140px)]">
          {activeTab === 'filters' ? (
            /* Filters Tab */
            <div className="p-6 space-y-6">
              {/* Radius Slider */}
              <div>
                <label className="text-sm font-medium text-foreground mb-3 block">
                  Search Radius: {filters.radius}km
                </label>
                <Slider
                  value={[filters.radius]}
                  onValueChange={(value) => handleFilterChange('radius', value[0])}
                  max={10}
                  min={0.5}
                  step={0.5}
                  className="w-full"
                />
              </div>

              {/* Vibe Selection */}
              <div>
                <h3 className="text-lg font-extrabold text-white mb-2 drop-shadow-sm tracking-wide glow-primary/60">
                  What's your vibe?
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {vibeOptions.map((vibe) => (
                    <button
                      key={vibe.value}
                      onClick={() => handleFilterChange('vibe', vibe.value)}
                      className={cn(
                        "flex flex-col items-center justify-center rounded-2xl border transition-all duration-150",
                        "px-3 py-2 md:px-4 md:py-2 min-w-[80px] min-h-[56px] md:min-w-[96px] md:min-h-[64px]",
                        "text-xs md:text-sm font-semibold gap-1",
                        filters.vibe === vibe.value
                          ? "border-primary bg-primary/10 shadow-lg ring-2 ring-primary/40 scale-105 text-primary"
                          : "border-white/10 bg-white/5 hover:bg-white/10 text-white/80"
                      )}
                    >
                      <span className="text-lg md:text-xl">
                        {vibe.icon}
                      </span>
                      {vibe.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Activity Type */}
              <div>
                <h3 className="text-lg font-extrabold text-white mb-2 drop-shadow-sm tracking-wide glow-primary/60">
                  What are you looking for?
                </h3>
                <div className="grid grid-cols-3 gap-2">
                  {activityTypes.map((activity) => (
                    <button
                      key={activity.value}
                      onClick={() => handleFilterChange('activityType', activity.value)}
                      className={cn(
                        "flex flex-col items-center justify-center rounded-2xl border transition-all duration-150",
                        "px-3 py-2 md:px-4 md:py-2 min-w-[80px] min-h-[56px] md:min-w-[96px] md:min-h-[64px]",
                        "text-xs md:text-sm font-semibold gap-1",
                        filters.activityType === activity.value
                          ? "border-primary bg-primary/10 shadow-lg ring-2 ring-primary/40 scale-105 text-primary"
                          : "border-white/10 bg-white/5 hover:bg-white/10 text-white/80"
                      )}
                    >
                      <span className="text-lg md:text-xl">
                        {activity.icon}
                      </span>
                      {activity.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time of Day */}
              <div>
                <h3 className="text-lg font-extrabold text-white mb-2 drop-shadow-sm tracking-wide glow-primary/60">
                  When are you going?
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  {timeOptions.map((time) => (
                    <button
                      key={time.value}
                      onClick={() => handleFilterChange('timeOfDay', time.value)}
                      className={cn(
                        "flex flex-col items-center justify-center rounded-2xl border transition-all duration-150",
                        "px-3 py-2 md:px-4 md:py-2 min-w-[80px] min-h-[56px] md:min-w-[96px] md:min-h-[64px]",
                        "text-xs md:text-sm font-semibold gap-1",
                        filters.timeOfDay === time.value
                          ? "border-primary bg-primary/10 shadow-lg ring-2 ring-primary/40 scale-105 text-primary"
                          : "border-white/10 bg-white/5 hover:bg-white/10 text-white/80"
                      )}
                    >
                      <span className="text-lg md:text-xl">
                        {time.icon}
                      </span>
                      {time.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Group Size */}
              <div>
                <label className="text-sm font-medium text-foreground mb-3 block">
                  Group Size: {filters.groupSize} {filters.groupSize === 1 ? 'person' : 'people'}
                </label>
                <Slider
                  value={[filters.groupSize]}
                  onValueChange={(value) => handleFilterChange('groupSize', value[0])}
                  max={10}
                  min={1}
                  step={1}
                  className="w-full"
                />
              </div>

              {/* Budget */}
              <div>
                <h3 className="text-lg font-extrabold text-white mb-2 drop-shadow-sm tracking-wide glow-primary/60">
                  Budget
                </h3>
                <div className="grid grid-cols-4 gap-2">
                  {budgetOptions.map((budget) => (
                    <button
                      key={budget.value}
                      onClick={() => handleFilterChange('budget', budget.value)}
                      className={cn(
                        "flex flex-col items-center justify-center rounded-2xl border transition-all duration-150",
                        "px-3 py-2 md:px-4 md:py-2 min-w-[80px] min-h-[56px] md:min-w-[96px] md:min-h-[64px]",
                        "text-xs md:text-sm font-semibold gap-1",
                        filters.budget === budget.value
                          ? "border-primary bg-primary/10 shadow-lg ring-2 ring-primary/40 scale-105 text-primary"
                          : "border-white/10 bg-white/5 hover:bg-white/10 text-white/80"
                      )}
                    >
                      {budget.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Duration */}
              <div>
                <h3 className="text-lg font-extrabold text-white mb-2 drop-shadow-sm tracking-wide glow-primary/60">
                  Duration
                </h3>
                <div className="grid grid-cols-2 gap-2">
                  {durationOptions.map((duration) => (
                    <button
                      key={duration.value}
                      onClick={() => handleFilterChange('duration', duration.value)}
                      className={cn(
                        "flex flex-col items-center justify-center rounded-2xl border transition-all duration-150",
                        "px-3 py-2 md:px-4 md:py-2 min-w-[80px] min-h-[56px] md:min-w-[96px] md:min-h-[64px]",
                        "text-xs md:text-sm font-semibold gap-1",
                        filters.duration === duration.value
                          ? "border-primary bg-primary/10 shadow-lg ring-2 ring-primary/40 scale-105 text-primary"
                          : "border-white/10 bg-white/5 hover:bg-white/10 text-white/80"
                      )}
                    >
                      {duration.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Generate Button */}
              <Button
                onClick={generateRecommendations}
                disabled={isLoading}
                className="w-full py-3"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin mr-2" />
                    Finding perfect matches...
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Discover Now
                  </>
                )}
              </Button>
            </div>
          ) : (
            /* Results Tab */
            <div className="p-6">
              {isLoading ? (
                <div className="text-center py-12">
                  <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4" />
                  <p className="text-muted-foreground">Finding the perfect places for you...</p>
                </div>
              ) : error ? (
                <div className="text-center py-12">
                  <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">Something went wrong</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    {error.message || 'Please try again'}
                  </p>
                  <Button 
                    onClick={() => refetch()} 
                    className="mt-4"
                    variant="outline"
                  >
                    Try Again
                  </Button>
                </div>
              ) : recommendations.length > 0 ? (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-semibold text-foreground">
                      Perfect Matches Found
                    </h3>
                    <Badge variant="secondary" className="text-xs">
                      AI Powered ✨
                    </Badge>
                  </div>
                  
                  <div className="grid grid-cols-1 gap-4">
                    {recommendations.map((item) => (
                      <EnhancedRecommendationCard
                        key={item.id}
                        item={item}
                        onAction={handleItemAction}
                      />
                    ))}
                  </div>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Target className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
                  <p className="text-muted-foreground">No matches found with current filters</p>
                  <p className="text-sm text-muted-foreground mt-1">
                    Try adjusting your preferences
                  </p>
                  <Button 
                    onClick={() => setActiveTab('filters')} 
                    className="mt-4"
                    variant="outline"
                  >
                    Adjust Filters
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}; 