import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { 
  Sparkles, 
  MapPin, 
  Clock, 
  Users, 
  TrendingUp, 
  RefreshCw,
  ExternalLink,
  Star,
  Zap
} from 'lucide-react';
import { useSmartActivitySuggestions } from '@/hooks/useSmartActivitySuggestions';
import { useGeo } from '@/hooks/useGeo';
import { useCurrentVibe } from '@/lib/store/useVibe';
import { motion } from 'framer-motion';

interface SmartActivitySuggestionsProps {
  contextType?: 'solo' | 'group' | 'date' | 'friends';
  groupSize?: number;
  timeContext?: 'now' | 'evening' | 'weekend';
}

export const SmartActivitySuggestions: React.FC<SmartActivitySuggestionsProps> = ({
  contextType = 'solo',
  groupSize = 1,
  timeContext = 'now'
}) => {
  const { coords } = useGeo();
  const currentVibe = useCurrentVibe();
  const [refreshKey, setRefreshKey] = useState(0);
  
  const { 
    data: suggestions, 
    isLoading, 
    error,
    refetch 
  } = useSmartActivitySuggestions({
    lat: coords?.lat || null,
    lng: coords?.lng || null,
    context: contextType,
    groupSize,
    timeContext,
    vibe: currentVibe,
    enabled: !!coords?.lat && !!coords?.lng
  }, refreshKey);

  const handleRefresh = () => {
    setRefreshKey(prev => prev + 1);
    refetch();
  };

  if (!coords?.lat || !coords?.lng) {
    return (
      <Card>
        <CardContent className="p-6 text-center">
          <MapPin className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
          <p className="text-muted-foreground">Enable location to get personalized activity suggestions</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-primary" />
            <CardTitle>Smart Activity Suggestions</CardTitle>
          </div>
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleRefresh}
            disabled={isLoading}
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
          </Button>
        </div>
        <CardDescription>
          AI-powered suggestions based on your vibe, location, and social context
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Context Info */}
        <div className="flex items-center gap-2 p-3 bg-muted/50 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <Badge variant="outline">{contextType}</Badge>
            {groupSize > 1 && (
              <Badge variant="secondary">
                <Users className="h-3 w-3 mr-1" />
                {groupSize} people
              </Badge>
            )}
            <Badge variant="outline">
              <Clock className="h-3 w-3 mr-1" />
              {timeContext}
            </Badge>
            {currentVibe && (
              <Badge>
                <Zap className="h-3 w-3 mr-1" />
                {currentVibe}
              </Badge>
            )}
          </div>
        </div>

        {/* Suggestions List */}
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map(i => (
              <div key={i} className="p-4 border rounded-lg">
                <div className="flex items-start gap-3">
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <div className="flex-1 space-y-2">
                    <Skeleton className="h-4 w-3/4" />
                    <Skeleton className="h-3 w-full" />
                    <div className="flex gap-2">
                      <Skeleton className="h-6 w-16" />
                      <Skeleton className="h-6 w-20" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : error ? (
          <div className="text-center py-8">
            <div className="text-muted-foreground">
              <Sparkles className="h-8 w-8 mx-auto mb-2" />
              <p>Unable to load suggestions. Please try again.</p>
              <Button variant="outline" onClick={handleRefresh} className="mt-2">
                Retry
              </Button>
            </div>
          </div>
        ) : suggestions && suggestions.length > 0 ? (
          <div className="space-y-3">
            {suggestions.map((suggestion, index) => (
              <motion.div
                key={suggestion.id}
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: index * 0.1 }}
                className="group p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start gap-3">
                  {/* Activity Icon/Emoji */}
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center text-lg">
                    {suggestion.emoji || '🎯'}
                  </div>
                  
                  {/* Main Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between mb-2">
                      <h4 className="font-medium text-base group-hover:text-primary transition-colors">
                        {suggestion.title}
                      </h4>
                      <div className="flex items-center gap-1 ml-2">
                        <Star className="h-3 w-3 text-amber-500" />
                        <span className="text-xs font-medium">
                          {(suggestion.confidence * 100).toFixed(0)}%
                        </span>
                      </div>
                    </div>
                    
                    <p className="text-sm text-muted-foreground mb-3 leading-relaxed">
                      {suggestion.description}
                    </p>
                    
                    {/* Metadata Badges */}
                    <div className="flex flex-wrap gap-2 mb-3">
                      {suggestion.estimatedDuration && (
                        <Badge variant="outline" className="text-xs">
                          <Clock className="h-3 w-3 mr-1" />
                          {suggestion.estimatedDuration}
                        </Badge>
                      )}
                      
                      {suggestion.distance && (
                        <Badge variant="outline" className="text-xs">
                          <MapPin className="h-3 w-3 mr-1" />
                          {suggestion.distance}
                        </Badge>
                      )}
                      
                      {suggestion.category && (
                        <Badge variant="secondary" className="text-xs">
                          {suggestion.category}
                        </Badge>
                      )}
                      
                      {suggestion.energyLevel && (
                        <Badge 
                          variant={
                            suggestion.energyLevel === 'high' ? 'default' : 
                            suggestion.energyLevel === 'medium' ? 'secondary' : 'outline'
                          } 
                          className="text-xs"
                        >
                          {suggestion.energyLevel} energy
                        </Badge>
                      )}
                    </div>
                    
                    {/* Reasoning */}
                    {suggestion.reasoning && suggestion.reasoning.length > 0 && (
                      <div className="mb-3">
                        <div className="text-xs text-muted-foreground space-y-1">
                          {suggestion.reasoning.slice(0, 2).map((reason, i) => (
                            <div key={i} className="flex items-center gap-1">
                              <div className="w-1 h-1 rounded-full bg-primary" />
                              <span>{reason}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Action Buttons */}
                    <div className="flex items-center gap-2">
                      {suggestion.venueId && (
                        <Button size="sm" variant="outline">
                          <MapPin className="h-3 w-3 mr-1" />
                          View Venue
                        </Button>
                      )}
                      
                      <Button size="sm" variant="outline">
                        <ExternalLink className="h-3 w-3 mr-1" />
                        Learn More
                      </Button>
                      
                      {contextType === 'group' && (
                        <Button size="sm">
                          <Users className="h-3 w-3 mr-1" />
                          Share with Group
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <div className="text-muted-foreground">
              <Sparkles className="h-8 w-8 mx-auto mb-2" />
              <p>No suggestions available right now.</p>
              <p className="text-xs mt-1">Try changing your vibe or context settings.</p>
            </div>
          </div>
        )}
        
        {/* Trend Insight */}
        {suggestions && suggestions.length > 0 && (
          <div className="mt-4 p-3 bg-gradient-to-r from-primary/5 to-secondary/5 rounded-lg">
            <div className="flex items-center gap-2 text-sm">
              <TrendingUp className="h-4 w-4 text-primary" />
              <span className="font-medium">Insight:</span>
              <span className="text-muted-foreground">
                Based on your {currentVibe || 'current'} vibe and recent patterns, 
                {contextType === 'group' ? ' group activities' : ' solo activities'} 
                {' '}are trending up in your area.
              </span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};