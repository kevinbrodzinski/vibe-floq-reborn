import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MapPin, Heart, UserPlus, Share, Calendar, Navigation, MessageSquare, Users, Star, TrendingUp, Clock, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card } from '@/components/ui/card';
import { useVenueDetails } from '@/hooks/useVenueDetails';
import { useEnhancedVenueDetails } from '@/hooks/useEnhancedVenueDetails';
import { useFavorites } from '@/hooks/useFavorites';
import { useVenueInteractions } from '@/hooks/useVenueInteractions';
import { useAuth } from '@/providers/AuthProvider';
import { openNativeMaps } from '@/utils/nativeNavigation';
import { cn } from '@/lib/utils';
import { zIndex } from '@/constants/z';

interface VenueDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  venueId: string | null;
}

export const VenueDetailModal: React.FC<VenueDetailModalProps> = ({
  isOpen,
  onClose,
  venueId
}) => {
  const { user } = useAuth();
  const { data: venueDetails, isLoading } = useVenueDetails(venueId);
  const { data: enhancedDetails } = useEnhancedVenueDetails(venueId);
  const { isFavorite, toggleFavorite, isToggling } = useFavorites();
  const { checkIn, share, view, isLoading: isInteracting } = useVenueInteractions();

  // Track view interaction when modal opens
  React.useEffect(() => {
    if (isOpen && venueId) {
      view(venueId);
    }
  }, [isOpen, venueId, view]);

  const handleFavoriteToggle = async () => {
    if (!venueId || !user) return;
    
    await toggleFavorite({
      itemId: venueId,
      itemType: 'venue',
      title: venueDetails?.name || 'Venue',
      description: venueDetails?.description || '',
      imageUrl: undefined,
    });
  };

  const handleGetDirections = () => {
    if (!venueDetails) return;
    openNativeMaps({ lat: venueDetails.lat, lng: venueDetails.lng });
  };

  const handleCheckIn = () => {
    if (!venueId) return;
    checkIn(venueId);
  };

  const handleShare = () => {
    if (!venueId) return;
    share(venueId);
    // TODO: Implement native sharing
  };

  const handleCreatePlan = () => {
    // TODO: Navigate to plan creation with venue pre-selected
    console.log('Create plan with venue:', venueId);
  };

  const handleInviteFriends = () => {
    // TODO: Open friend invitation modal
    console.log('Invite friends to venue:', venueId);
  };

  if (!venueId) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={onClose}
            {...zIndex('dmSheet')}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="fixed inset-0 bg-background overflow-hidden"
            {...zIndex('dmSheet')}
          >
            {/* Header */}
            <div className="sticky top-0 z-10 bg-background/95 backdrop-blur-md border-b border-border/30">
              <div className="flex items-center justify-between p-4">
                <div className="flex items-center gap-3">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={onClose}
                    className="p-2 h-8 w-8"
                  >
                    <X className="h-4 w-4" />
                  </Button>
                  {venueDetails && (
                    <div>
                      <h1 className="text-lg font-semibold truncate max-w-48">{venueDetails.name}</h1>
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Users className="w-3 h-3" />
                        <span>{venueDetails.live_count} here now</span>
                        <span>•</span>
                        <TrendingUp className="w-3 h-3" />
                        <span>{venueDetails.vibe_score}% vibe</span>
                      </div>
                    </div>
                  )}
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleFavoriteToggle}
                  disabled={isToggling || !user}
                  className="p-2 h-8 w-8"
                >
                  <Heart className={cn("h-4 w-4", isFavorite(venueId) && "fill-red-500 text-red-500")} />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-auto">
              {isLoading ? (
                <div className="flex items-center justify-center h-96">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                </div>
              ) : venueDetails ? (
                <div className="p-4 space-y-6">
                  {/* Hero Section */}
                  <Card className="overflow-hidden">
                    <div className="relative h-48 bg-gradient-to-br from-primary/20 via-primary/10 to-primary/5">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <MapPin className="w-16 h-16 text-primary/40" />
                      </div>
                      <div className="absolute bottom-4 left-4 right-4">
                        <div className="flex items-center justify-between">
                          <Badge variant="secondary" className="bg-background/90">
                            {venueDetails.vibe || 'Social'} Vibe
                          </Badge>
                          <Badge variant="outline" className="bg-background/90">
                            Popularity: {venueDetails.popularity}%
                          </Badge>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Live Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <Card className="p-4 text-center">
                      <div className="text-2xl font-bold text-primary">{venueDetails.live_count}</div>
                      <div className="text-sm text-muted-foreground">People Now</div>
                    </Card>
                    <Card className="p-4 text-center">
                      <div className="text-2xl font-bold text-green-600">{venueDetails.vibe_score}%</div>
                      <div className="text-sm text-muted-foreground">Vibe Score</div>
                    </Card>
                    <Card className="p-4 text-center">
                      <div className="text-2xl font-bold text-blue-600">{venueDetails.popularity}%</div>
                      <div className="text-sm text-muted-foreground">Popularity</div>
                    </Card>
                  </div>

                  {/* Enhanced Intelligence */}
                  {enhancedDetails && (
                    <Card className="p-4">
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <Zap className="w-5 h-5 text-primary" />
                        Live Intelligence
                      </h3>
                      <div className="space-y-3 text-sm">
                        {enhancedDetails.socialTexture && (
                          <div>
                            <span className="font-medium">Social Energy:</span>{' '}
                            <span className="text-muted-foreground">{enhancedDetails.socialTexture.moodDescription}</span>
                          </div>
                        )}
                        {enhancedDetails.dominant_vibe && (
                          <div>
                            <span className="font-medium">Dominant Vibe:</span>{' '}
                            <span className="text-muted-foreground">{enhancedDetails.dominant_vibe}</span>
                          </div>
                        )}
                      </div>
                    </Card>
                  )}

                  {/* Primary Actions */}
                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      onClick={handleCheckIn}
                      disabled={isInteracting}
                      className="h-12"
                    >
                      <Clock className="w-4 h-4 mr-2" />
                      Check In
                    </Button>
                    <Button
                      variant="secondary"
                      onClick={handleGetDirections}
                      className="h-12"
                    >
                      <Navigation className="w-4 h-4 mr-2" />
                      Directions
                    </Button>
                  </div>

                  {/* Secondary Actions */}
                  <div className="grid grid-cols-3 gap-3">
                    <Button
                      variant="outline"
                      onClick={handleCreatePlan}
                      className="h-10"
                    >
                      <Calendar className="w-4 h-4 mr-1" />
                      Plan
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleInviteFriends}
                      className="h-10"
                    >
                      <UserPlus className="w-4 h-4 mr-1" />
                      Invite
                    </Button>
                    <Button
                      variant="outline"
                      onClick={handleShare}
                      disabled={isInteracting}
                      className="h-10"
                    >
                      <Share className="w-4 h-4 mr-1" />
                      Share
                    </Button>
                  </div>

                  {/* Recent Activity */}
                  {enhancedDetails?.recentPosts && enhancedDetails.recentPosts.length > 0 && (
                    <Card className="p-4">
                      <h3 className="text-lg font-semibold mb-3 flex items-center gap-2">
                        <MessageSquare className="w-5 h-5 text-primary" />
                        Recent Posts
                      </h3>
                      <div className="space-y-3">
                        {enhancedDetails.recentPosts.slice(0, 3).map((post, idx) => (
                          <div key={idx} className="text-sm p-3 bg-muted/50 rounded-lg">
                            <p className="text-muted-foreground">{post.text_content}</p>
                            <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                              <span>{post.profiles.display_name || post.profiles.username}</span>
                              <span>•</span>
                              <Badge variant="outline" className="text-xs">{post.vibe}</Badge>
                            </div>
                          </div>
                        ))}
                      </div>
                    </Card>
                  )}
                </div>
              ) : (
                <div className="flex items-center justify-center h-96">
                  <p className="text-muted-foreground">Venue not found</p>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};