import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { UsernameLink } from "@/components/ui/username-link";
import { UserPlus, Users, MapPin, Heart } from "lucide-react";
import { useFriendSuggestions, type FriendSuggestion } from "@/hooks/useFriendSuggestions";
import { useUnifiedFriends } from "@/hooks/useUnifiedFriends";
import { useToast } from "@/hooks/use-toast";

interface ConnectionInsightsProps {
  profileId: string;
}

export function ConnectionInsights({ profileId }: ConnectionInsightsProps) {
  const { data: suggestions = [], isLoading } = useFriendSuggestions(6);
  const { sendRequest, updating } = useUnifiedFriends();
  const { toast } = useToast();

  const handleSendRequest = (suggestion: FriendSuggestion) => {
    sendRequest(suggestion.id);
  };

  if (!suggestions.length && !isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Connection Insights
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground">
          <p className="text-lg font-medium">No suggestions yet</p>
          <p className="text-sm">Add interests to discover friends</p>
        </CardContent>
      </Card>
    );
  }

  const getCompatibilityColor = (sharedTags: number) => {
    if (sharedTags >= 3) return "text-green-500";
    if (sharedTags >= 1) return "text-yellow-500";
    return "text-gray-500";
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Connection Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-3 animate-pulse">
                <div className="w-10 h-10 bg-muted rounded-full" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-muted rounded w-1/3" />
                  <div className="h-3 bg-muted rounded w-1/2" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (suggestions.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Connection Insights
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No friend suggestions available yet.</p>
            <p className="text-sm">Try adding interests to your profile!</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Users className="h-5 w-5" />
          Connection Insights
          <Badge variant="secondary" className="ml-auto">
            {suggestions.length} suggestions
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
            >
              <div className="flex items-center space-x-3">
                <Avatar className="h-10 w-10">
                  <img
                    src={suggestion.avatar_url || '/placeholder.svg'}
                    alt={suggestion.display_name || suggestion.username}
                    className="rounded-full"
                  />
                </Avatar>
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <UsernameLink username={suggestion.username} className="font-medium" />
                      {suggestion.shared_tags > 0 && (
                        <span className={`text-sm font-medium ${getCompatibilityColor(suggestion.shared_tags)}`}>
                          {suggestion.shared_tags} shared
                        </span>
                      )}
                  </div>
                  
                  <div className="flex items-center gap-3 text-xs text-muted-foreground">
                    {/* @ts-expect-error - interests from profile */}
                    {suggestion.interests && suggestion.interests.length > 0 && (
                      <span className="flex items-center gap-1">
                        <Heart className="h-3 w-3" />
                        {suggestion.interests.length} interests
                      </span>
                    )}
                  </div>
                  
                  {/* @ts-expect-error - interests from profile */}
                  {suggestion.interests && suggestion.interests.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1">
                      {suggestion.interests.slice(0, 3).map((interest) => (
                        <Badge key={interest} variant="outline" className="text-xs px-1 py-0">
                          {interest}
                        </Badge>
                      ))}
                      {suggestion.interests.length > 3 && (
                        <span className="text-xs text-muted-foreground">
                          +{suggestion.interests.length - 3} more
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
              
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleSendRequest(suggestion)}
                disabled={updating}
                className="ml-2 shrink-0"
              >
                <UserPlus className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}