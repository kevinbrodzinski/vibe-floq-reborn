
import { useState, useEffect } from "react";
import { Search, Plus, Coffee, MessageCircle, Users, MapPin, Clock, UserPlus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { getEnvironmentConfig } from "@/lib/environment";
import { useActiveFloqs, type FloqRow } from "@/hooks/useActiveFloqs";
import { useFloqJoin } from "@/hooks/useFloqJoin";
import { useAvatarClusterUpdates } from "@/hooks/useAvatarClusterUpdates";
import { RecommendationsStrip } from "@/components/RecommendationsStrip";
import { SuggestionsToast } from "@/components/SuggestionsToast";
import { BoostButton } from "@/components/BoostButton";
import { SuggestChangeSheet } from "@/components/SuggestChangeSheet";
import { toast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@supabase/auth-helpers-react";

import { useFloqUI } from "@/contexts/FloqUIContext";
import { RadiusSlider } from "@/components/RadiusSlider";
import { CreateFloqSheet } from "@/components/CreateFloqSheet";
import { DMQuickSheet } from "@/components/DMQuickSheet";
import { GeolocationButton } from "@/components/ui/geolocation-button";
import { FloqsDebugPanel } from "@/components/debug/FloqsDebugPanel";
import { useDebug } from "@/lib/useDebug";

// Vibe color mapping
const vibeColor: Record<string, string> = {
  chill: 'hsl(180, 70%, 60%)',
  hype: 'hsl(260, 70%, 65%)',
  romantic: 'hsl(330, 70%, 65%)',
  social: 'hsl(25, 70%, 60%)',
  solo: 'hsl(210, 70%, 65%)',
  weird: 'hsl(280, 70%, 65%)',
  flowing: 'hsl(100, 70%, 60%)',
  down: 'hsl(220, 15%, 55%)',
};

// Component for individual floq cards
const FloqCard = ({ row, onJoin, onChat, onSuggestChange, onCardClick }: { 
  row: FloqRow; 
  onJoin: () => void;
  onChat: () => void;
  onSuggestChange: () => void;
  onCardClick: () => void;
}) => {
  // Find the actual creator instead of assuming first member
  const creator = row.members?.find(member => member.username || member.display_name) 
    || row.members?.[0];
  const primary = vibeColor[row.vibe_tag] || vibeColor.social;
  const isStartingSoon = row.starts_in_min <= 30;

  // Format distance for display
  const formatDistance = (meters: number | null) => {
    if (!meters) return null;
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  return (
    <div 
      onClick={onCardClick}
      className="bg-card/40 backdrop-blur-lg rounded-3xl p-6 border border-border/30 transition-all duration-300 hover:scale-[1.02] hover:translate-y-[-2px] hover:bg-card/60 cursor-pointer"
      style={{ pointerEvents: 'auto' }}
    >
      <div className="flex items-center space-x-4 mb-6">
        <div 
          className="w-16 h-16 rounded-full flex items-center justify-center animate-pulse"
          onClick={(e) => e.stopPropagation()}
          style={{
            backgroundColor: primary + '1A',
            boxShadow: `0 0 30px ${primary}40`,
            pointerEvents: 'none'
          }}
        >
          <Coffee size={28} style={{ color: primary }} />
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-semibold text-foreground mb-1 line-clamp-2">
            {row.title || row.name}
          </h3>
          <div className="flex items-center space-x-2 text-muted-foreground text-sm mb-2">
            <span className="capitalize font-medium">{row.vibe_tag}</span>
            <span>•</span>
            {creator && (
              <>
                <span>by {creator.display_name || creator.username}</span>
                <span>•</span>
              </>
            )}
            {!row.ends_at ? (
              <span className="text-persistent-600 font-medium">Ongoing</span>
            ) : row.starts_in_min > 0 ? (
              <span>Starts in {row.starts_in_min} min</span>
            ) : (
              <span>Ends in {Math.ceil((new Date(row.ends_at).getTime() - Date.now()) / (1000 * 60))} min</span>
            )}
            {row.distance_meters && (
              <>
                <span>•</span>
                <div className="flex items-center gap-1">
                  <MapPin size={12} />
                  <span>{formatDistance(row.distance_meters)}</span>
                </div>
              </>
            )}
          </div>
          
          {/* Persistent badge */}
          {!row.ends_at && (
            <div className="inline-flex items-center px-2 py-1 bg-persistent/15 text-persistent-foreground text-xs rounded-full mb-2">
              <div className="w-1.5 h-1.5 bg-persistent rounded-full mr-1.5 animate-pulse"></div>
              Ongoing
            </div>
          )}
          
          {/* Participant avatars */}
          <div className="flex items-center space-x-2">
            <div className="flex -space-x-2">
              {row.members.slice(0, 4).map((member, idx) => (
                <div 
                  key={member.id || idx}
                  className="w-6 h-6 rounded-full bg-gradient-secondary border-2 border-background overflow-hidden"
                >
                   {member.avatar_url ? (
                     <img 
                       src={member.avatar_url} 
                       alt={member.display_name || member.username || 'User'} 
                       className="w-full h-full object-cover"
                     />
                   ) : (
                     <div className="w-full h-full bg-surface/30 animate-pulse flex items-center justify-center">
                       <Users size={12} className="text-muted-foreground" />
                     </div>
                   )}
                </div>
              ))}
            </div>
            <span className="text-xs text-muted-foreground">
              {row.participant_count} joined
            </span>
          </div>
        </div>
      </div>

      {/* Status indicators */}
      <div className="flex flex-wrap gap-2 mb-4">
        <span className="px-3 py-1 rounded-full text-xs border border-primary/50 text-primary bg-primary/10">
          Open
        </span>
        <span className="px-3 py-1 rounded-full text-xs border border-border/40 text-muted-foreground">
          {row.type}
        </span>
        {isStartingSoon && (
          <span className="px-3 py-1 rounded-full text-xs border border-accent/50 text-accent bg-accent/10">
            Starting Soon
          </span>
        )}
      </div>

      {/* Action buttons */}
      <div className="flex flex-wrap gap-3">
        <div className="flex gap-3 flex-1">
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onJoin();
            }}
            size="sm"
            disabled={getEnvironmentConfig().presenceMode === 'offline'}
            className="bg-gradient-to-r from-primary to-primary-variant text-primary-foreground border-0 disabled:opacity-50"
          >
            <UserPlus className="w-4 h-4" />
            Join
          </Button>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onChat();
            }}
            size="sm"
            variant="outline"
            disabled={getEnvironmentConfig().presenceMode === 'offline'}
            className="border-primary/30 text-primary hover:bg-primary/10 disabled:opacity-50"
          >
            <MessageCircle className="w-4 h-4" />
            Chat
          </Button>
          <Button
            onClick={(e) => {
              e.stopPropagation();
              onSuggestChange();
            }}
            size="sm"
            variant="ghost"
            disabled={getEnvironmentConfig().presenceMode === 'offline'}
            className="text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <Clock className="w-4 h-4" />
            Suggest
          </Button>
        </div>
        <div className="flex justify-end">
          <div onClick={(e) => e.stopPropagation()}>
            <BoostButton 
              floqId={row.id} 
              boostCount={row.boost_count}
              size="sm"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export const FloqsScreen = () => {
  const navigate = useNavigate();
  const session = useSession();
  const user = session?.user;
  const [debug] = useDebug();
  const { setShowCreateSheet } = useFloqUI();
  const [dmSheetOpen, setDmSheetOpen] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [suggestChangeOpen, setSuggestChangeOpen] = useState(false);
  const [selectedFloqForSuggestion, setSelectedFloqForSuggestion] = useState<FloqRow | null>(null);
  const [userGeo, setUserGeo] = useState<{ lat: number; lng: number } | null>(null);
  
  // Get stored radius preference or default to 0.5km
  const getStoredRadius = () => {
    try {
      const stored = localStorage.getItem('floq-radius-km');
      if (!stored) return 0.5;
      const parsed = parseFloat(stored);
      return isNaN(parsed) ? 0.5 : parsed;
    } catch {
      return 0.5;
    }
  };

  const [radiusKm, setRadiusKm] = useState(getStoredRadius);
  const { data: floqs = [], isLoading, error } = useActiveFloqs({
    limit: 50,
    includeDistance: true
  });
  const { join, isPending } = useFloqJoin();

  // Add debug logging
  useEffect(() => {
    console.log('FloqsScreen: Query state', {
      isLoading,
      error: error?.message,
      floqsCount: floqs.length,
      floqs: floqs.length > 0 ? floqs.slice(0, 2) : 'No floqs'
    });
  }, [isLoading, error, floqs]);
  
  // Enable real-time avatar cluster updates
  useAvatarClusterUpdates();

  // Get user's location for suggestions
  useEffect(() => {
    navigator.geolocation?.getCurrentPosition(
      (position) => {
        setUserGeo({
          lat: position.coords.latitude,
          lng: position.coords.longitude,
        });
      },
      () => {
        // Silently handle location errors
      },
      { enableHighAccuracy: false, timeout: 10000 }
    );
  }, []);

  // Persist radius preference
  useEffect(() => {
    try {
      localStorage.setItem('floq-radius-km', radiusKm.toString());
    } catch {
      // Ignore localStorage errors
    }
  }, [radiusKm]);

  // Action handlers
  const handleJoinFloq = (floqId: string) => {
    const env = getEnvironmentConfig();
    if (env.presenceMode === 'offline') {
      // Already handled in the hook with toast
      return;
    }
    join({ floqId });
  };

  const handleChat = async (floq: FloqRow) => {
    // Get the first participant (creator) to start a DM
    const creator = floq.members?.[0];
    if (!creator?.id) {
      toast({
        title: "No organizer found",
        description: "Unable to find the floq organizer to chat with.",
        variant: "destructive",
      });
      return;
    }

    try {
      const { data, error } = await supabase.rpc('find_or_create_dm', { 
        a: user?.id, 
        b: creator.id 
      });
      
      if (error) {
        console.error('DM creation error:', error);
        toast({
          title: "Chat unavailable",
          description: "Unable to start chat. Please try again.",
          variant: "destructive",
        });
        return;
      }

      // Navigate to DM
      navigate(`/dm/${data}`);
    } catch (error) {
      console.error('Chat error:', error);
      toast({
        title: "Chat error",
        description: "Something went wrong starting the chat.",
        variant: "destructive",
      });
    }
  };

  const handleSuggestChange = (floq: FloqRow) => {
    setSelectedFloqForSuggestion(floq);
    setSuggestChangeOpen(true);
  };

  return (
    <div className="min-h-screen p-6 pt-16">
      {/* Debug counter */}
      {debug && (
        <div className="absolute top-2 right-2 z-30 text-xs opacity-60 bg-black/20 px-2 py-1 rounded">
          {floqs.length} active floqs
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <button className="h-10 w-10 rounded-xl bg-surface/30 backdrop-blur-sm border border-border/20 hover:bg-surface/50 transition-all duration-300 flex items-center justify-center">
          <Search size={18} className="text-muted-foreground" />
        </button>
        <h1 className="text-2xl font-extrabold bg-gradient-primary bg-clip-text text-transparent">
          floqs
        </h1>
        <button 
          onClick={() => setShowCreateSheet(true)}
          className="h-10 w-10 rounded-xl bg-surface/30 backdrop-blur-sm border border-border/20 hover:bg-surface/50 transition-all duration-300 flex items-center justify-center"
        >
          <Plus size={20} className="text-muted-foreground" />
        </button>
      </div>

      {/* Location & Radius Controls */}
      <div className="mb-6 space-y-4">
        <div className="bg-card/40 backdrop-blur-lg rounded-3xl border border-border/20 p-4">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-medium text-foreground">Location Settings</h3>
            <GeolocationButton size="sm" />
          </div>
          <RadiusSlider km={radiusKm} onChange={setRadiusKm} />
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="animate-pulse text-muted-foreground">Loading floqs...</div>
        </div>
      )}

      {/* Error State */}
      {!isLoading && error && (
        <div className="text-center py-8">
          <p className="text-destructive">Error loading floqs</p>
          <p className="text-sm text-muted-foreground mt-1">{error.message}</p>
        </div>
      )}

      {/* No Floqs State */}
      {!isLoading && !error && floqs.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No active floqs right now</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Check back later or create one!</p>
        </div>
      )}

      {/* AI-Powered Recommendations */}
      <RecommendationsStrip 
        geo={userGeo}
        onSelectFloq={(floq) => handleJoinFloq(floq.floq_id)}
      />

      {/* Featured Floqs Grid */}
      {floqs.length > 0 && (
        <div className="space-y-6 mb-8">
          {floqs.map((floq) => (
            <FloqCard
              key={floq.id}
              row={floq}
              onJoin={() => handleJoinFloq(floq.id)}
              onChat={() => handleChat(floq)}
              onSuggestChange={() => handleSuggestChange(floq)}
              onCardClick={() => navigate(`/floqs/${floq.id}`)}
            />
          ))}
        </div>
      )}

      {/* Smart Suggestions Toast */}
      <SuggestionsToast 
        geo={userGeo}
        onJoinFloq={handleJoinFloq}
        minimumConfidence={0.75}
        cooldownMinutes={20}
      />

      {/* Bottom Navigation Spacer */}
      <div className="h-24"></div>

      {/* Debug Panel */}
      {debug && <FloqsDebugPanel />}

      {/* Create Floq Sheet - Now controlled by FloqUI context */}
      <CreateFloqSheet />

      {/* DM Quick Sheet */}
      <DMQuickSheet
        open={dmSheetOpen}
        onOpenChange={setDmSheetOpen}
        friendId={selectedFriendId}
      />

      {/* Suggest Change Sheet */}
      <SuggestChangeSheet
        floqId={selectedFloqForSuggestion?.id || ''}
        open={suggestChangeOpen}
        onOpenChange={setSuggestChangeOpen}
      />
    </div>
  );
};
