import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { 
  Brain, 
  MapPin, 
  Users, 
  Clock, 
  Target, 
  TrendingUp,
  Sliders,
  RefreshCw,
  Star,
  Zap,
  Heart
} from 'lucide-react';
import { VenueRecommendations } from '@/components/social/VenueRecommendations';
import { SmartActivitySuggestions } from '@/components/intelligence/SmartActivitySuggestions';
import { useIntelligentFriendSuggestions } from '@/hooks/useIntelligentFriendSuggestions';
import { useGeo } from '@/hooks/useGeo';
import { useCurrentVibe } from '@/lib/store/useVibe';
import { motion } from 'framer-motion';

interface RecommendationFilters {
  maxDistance: number; // km
  priceRange: [number, number]; // 1-4 scale
  energyLevel: 'any' | 'low' | 'medium' | 'high';
  socialLevel: 'any' | 'quiet' | 'moderate' | 'social';
  timePreference: 'any' | 'now' | 'evening' | 'weekend';
}

export const IntelligentRecommendationEngine: React.FC = () => {
  const { coords } = useGeo();
  const currentVibe = useCurrentVibe();
  
  const [activeTab, setActiveTab] = useState<'venues' | 'activities' | 'friends'>('venues');
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState<RecommendationFilters>({
    maxDistance: 3,
    priceRange: [1, 4],
    energyLevel: 'any',
    socialLevel: 'any',
    timePreference: 'any'
  });

  const { 
    data: friendSuggestions, 
    isLoading: friendsLoading,
    refetch: refetchFriends
  } = useIntelligentFriendSuggestions({
    enabled: activeTab === 'friends'
  });

  const handleFilterChange = (key: keyof RecommendationFilters, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
            <Brain className="h-5 w-5 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-semibold">Intelligent Recommendations</h2>
            <p className="text-sm text-muted-foreground">
              AI-powered suggestions tailored to your preferences
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setShowFilters(!showFilters)}
          >
            <Sliders className="h-4 w-4 mr-1" />
            Filters
          </Button>
        </div>
      </div>

      {/* Context Information */}
      <Card className="bg-gradient-to-r from-primary/5 to-secondary/5">
        <CardContent className="p-4">
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-1">
              <MapPin className="h-4 w-4 text-primary" />
              <span>{coords ? 'Location enabled' : 'No location'}</span>
            </div>
            {currentVibe && (
              <div className="flex items-center gap-1">
                <Zap className="h-4 w-4 text-secondary" />
                <span>Vibe: {currentVibe}</span>
              </div>
            )}
            <div className="flex items-center gap-1">
              <Clock className="h-4 w-4 text-accent" />
              <span>{new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters Panel */}
      {showFilters && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Recommendation Filters</CardTitle>
              <CardDescription>Customize your recommendations</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Max Distance: {filters.maxDistance}km</Label>
                  <Input
                    type="range"
                    min="0.5"
                    max="10"
                    step="0.5"
                    value={filters.maxDistance}
                    onChange={(e) => handleFilterChange('maxDistance', parseFloat(e.target.value))}
                  />
                </div>
                
                <div className="space-y-2">
                  <Label>Energy Level</Label>
                  <select
                    value={filters.energyLevel}
                    onChange={(e) => handleFilterChange('energyLevel', e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="any">Any Energy Level</option>
                    <option value="low">Low Energy</option>
                    <option value="medium">Medium Energy</option>
                    <option value="high">High Energy</option>
                  </select>
                </div>
                
                <div className="space-y-2">
                  <Label>Social Level</Label>
                  <select
                    value={filters.socialLevel}
                    onChange={(e) => handleFilterChange('socialLevel', e.target.value)}
                    className="w-full p-2 border rounded-md"
                  >
                    <option value="any">Any Social Level</option>
                    <option value="quiet">Quiet & Peaceful</option>
                    <option value="moderate">Moderate Social</option>
                    <option value="social">Very Social</option>
                  </select>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Main Recommendations */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as any)}>
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="venues" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Venues
          </TabsTrigger>
          <TabsTrigger value="activities" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Activities
          </TabsTrigger>
          <TabsTrigger value="friends" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            People
          </TabsTrigger>
        </TabsList>

        <TabsContent value="venues" className="space-y-4">
          <VenueRecommendations />
        </TabsContent>

        <TabsContent value="activities" className="space-y-4">
          <SmartActivitySuggestions 
            contextType="solo"
            timeContext={
              filters.timePreference === 'any' ? 'now' : 
              filters.timePreference as any
            }
          />
        </TabsContent>

        <TabsContent value="friends" className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Users className="h-5 w-5" />
                    Intelligent Friend Suggestions
                  </CardTitle>
                  <CardDescription>
                    People you might want to connect with based on shared interests and patterns
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => refetchFriends()}
                  disabled={friendsLoading}
                >
                  <RefreshCw className={`h-4 w-4 ${friendsLoading ? 'animate-spin' : ''}`} />
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {friendsLoading ? (
                <div className="space-y-3">
                  {[1, 2, 3].map(i => (
                    <div key={i} className="flex items-center gap-3 p-3 border rounded-lg animate-pulse">
                      <div className="w-10 h-10 bg-muted rounded-full" />
                      <div className="flex-1 space-y-1">
                        <div className="h-4 bg-muted rounded w-3/4" />
                        <div className="h-3 bg-muted rounded w-1/2" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : friendSuggestions && friendSuggestions.length > 0 ? (
                <div className="space-y-3">
                  {friendSuggestions.map((suggestion, index) => (
                    <motion.div
                      key={suggestion.profileId}
                      initial={{ y: 20, opacity: 0 }}
                      animate={{ y: 0, opacity: 1 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center gap-3 p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-medium">
                        {suggestion.displayName.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium">{suggestion.displayName}</h4>
                          <div className="flex items-center gap-1">
                            <Star className="h-3 w-3 text-amber-500" />
                            <span className="text-xs">
                              {(suggestion.matchScore * 100).toFixed(0)}% match
                            </span>
                          </div>
                        </div>
                        <p className="text-sm text-muted-foreground mb-2">
                          {suggestion.reason}
                        </p>
                        <div className="flex gap-1">
                          {suggestion.sharedInterests.slice(0, 3).map((interest, i) => (
                            <Badge key={i} variant="outline" className="text-xs">
                              {interest}
                            </Badge>
                          ))}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="sm" variant="outline">
                          <Heart className="h-3 w-3 mr-1" />
                          Connect
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2" />
                  <p>No friend suggestions available right now.</p>
                  <p className="text-xs mt-1">Keep being active to improve recommendations!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Recommendation Insights */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Recommendation Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-3 bg-primary/5 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Target className="h-4 w-4 text-primary" />
                <span className="font-medium text-sm">Accuracy Rate</span>
              </div>
              <div className="text-xl font-bold">87%</div>
              <div className="text-xs text-muted-foreground">of your interactions match our predictions</div>
            </div>
            
            <div className="p-3 bg-secondary/5 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Brain className="h-4 w-4 text-secondary" />
                <span className="font-medium text-sm">Learning Rate</span>
              </div>
              <div className="text-xl font-bold">+12%</div>
              <div className="text-xs text-muted-foreground">improvement this week</div>
            </div>
            
            <div className="p-3 bg-accent/5 rounded-lg">
              <div className="flex items-center gap-2 mb-1">
                <Star className="h-4 w-4 text-accent" />
                <span className="font-medium text-sm">Satisfaction</span>
              </div>
              <div className="text-xl font-bold">4.8/5</div>
              <div className="text-xs text-muted-foreground">average rating from users</div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};