import React, { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  RefreshCw, 
  Users, 
  Sparkles, 
  AlertCircle,
  Heart,
  Zap
} from 'lucide-react';
import { FriendSuggestionCard } from './FriendSuggestionCard';
import { useFriendSuggestions } from '@/hooks/useFriendDetection';
import { useAuth } from '@/hooks/useAuth';

interface FriendSuggestionsContainerProps {
  className?: string;
  showHeader?: boolean;
  maxSuggestions?: number;
  autoRefresh?: boolean;
}

export const FriendSuggestionsContainer: React.FC<FriendSuggestionsContainerProps> = ({
  className = '',
  showHeader = true,
  maxSuggestions = 10,
  autoRefresh = false
}) => {
  const { user } = useAuth();
  const [respondingToId, setRespondingToId] = useState<string | null>(null);

  const {
    suggestions,
    loading,
    error,
    generateSuggestions,
    respondToSuggestion,
    refetch
  } = useFriendSuggestions(user?.id || null, {
    limit: maxSuggestions,
    autoRefresh,
    refreshInterval: 5 * 60 * 1000 // 5 minutes
  });

  const handleAccept = async (suggestionId: string) => {
    setRespondingToId(suggestionId);
    try {
      await respondToSuggestion(suggestionId, 'accepted');
    } finally {
      setRespondingToId(null);
    }
  };

  const handleDecline = async (suggestionId: string) => {
    setRespondingToId(suggestionId);
    try {
      await respondToSuggestion(suggestionId, 'declined');
    } finally {
      setRespondingToId(null);
    }
  };

  const handleIgnore = async (suggestionId: string) => {
    setRespondingToId(suggestionId);
    try {
      await respondToSuggestion(suggestionId, 'ignored');
    } finally {
      setRespondingToId(null);
    }
  };

  const handleGenerateNew = async () => {
    await generateSuggestions();
  };

  const handleRefresh = async () => {
    await refetch();
  };

  if (!user) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Please sign in to see friend suggestions.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {showHeader && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gradient-to-r from-blue-500 to-purple-500">
                  <Sparkles className="h-5 w-5 text-white" />
                </div>
                <div>
                  <CardTitle className="text-xl">Friend Suggestions</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    Discover people you might know based on your activity patterns
                  </p>
                </div>
              </div>

              <div className="flex space-x-2">
                <Button
                  onClick={handleRefresh}
                  disabled={loading}
                  variant="outline"
                  size="sm"
                >
                  <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
                
                <Button
                  onClick={handleGenerateNew}
                  disabled={loading}
                  size="sm"
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                >
                  <Zap className="h-4 w-4 mr-2" />
                  Generate New
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>
      )}

      {/* Error State */}
      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            {error}
          </AlertDescription>
        </Alert>
      )}

      {/* Loading State */}
      {loading && suggestions.length === 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 3 }).map((_, index) => (
            <Card key={index} className="w-full max-w-md mx-auto">
              <CardHeader className="pb-3">
                <div className="flex items-center space-x-3">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <div className="space-y-2 flex-1">
                    <Skeleton className="h-4 w-24" />
                    <Skeleton className="h-3 w-16" />
                  </div>
                  <Skeleton className="h-6 w-12 rounded-full" />
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-3/4" />
                <div className="space-y-2">
                  <Skeleton className="h-3 w-20" />
                  <Skeleton className="h-2 w-full" />
                  <Skeleton className="h-2 w-full" />
                </div>
                <div className="flex space-x-2">
                  <Skeleton className="h-8 flex-1" />
                  <Skeleton className="h-8 w-8" />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Suggestions Grid */}
      {suggestions.length > 0 && (
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          <AnimatePresence mode="popLayout">
            {suggestions.map((suggestion) => (
              <motion.div
                key={suggestion.id}
                layout
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ duration: 0.2 }}
              >
                <FriendSuggestionCard
                  suggestion={suggestion}
                  onAccept={handleAccept}
                  onDecline={handleDecline}
                  onIgnore={handleIgnore}
                  isResponding={respondingToId === suggestion.id}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Empty State */}
      {!loading && suggestions.length === 0 && !error && (
        <Card>
          <CardContent className="p-12 text-center">
            <div className="flex flex-col items-center space-y-4">
              <div className="flex items-center justify-center w-16 h-16 rounded-full bg-gray-100">
                <Users className="h-8 w-8 text-gray-400" />
              </div>
              
              <div className="space-y-2">
                <h3 className="text-lg font-medium">No suggestions available</h3>
                <p className="text-muted-foreground max-w-md">
                  We haven't found any friend suggestions for you yet. Try joining more floqs, 
                  attending events, or visiting popular venues to discover potential friends!
                </p>
              </div>

              <Button
                onClick={handleGenerateNew}
                disabled={loading}
                className="mt-4"
              >
                <Sparkles className="h-4 w-4 mr-2" />
                Look for Suggestions
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Stats Footer */}
      {suggestions.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between text-sm text-muted-foreground">
              <div className="flex items-center space-x-4">
                <span className="flex items-center space-x-1">
                  <Heart className="h-4 w-4" />
                  <span>{suggestions.length} suggestions</span>
                </span>
                
                <span className="flex items-center space-x-1">
                  <Sparkles className="h-4 w-4" />
                  <span>
                    {suggestions.filter(s => s.confidence_level === 'very_high' || s.confidence_level === 'high').length} high matches
                  </span>
                </span>
              </div>

              {autoRefresh && (
                <span className="text-xs">
                  Auto-refreshing every 5 minutes
                </span>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};