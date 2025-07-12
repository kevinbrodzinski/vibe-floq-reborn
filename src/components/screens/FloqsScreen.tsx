
import { useState, useEffect } from "react";
import { Search, Plus, Coffee, MessageCircle, Users, MapPin } from "lucide-react";
import { useActiveFloqs, type FloqRow } from "@/hooks/useActiveFloqs";
import { useFloqJoin } from "@/hooks/useFloqJoin";
import { useAvatarClusterUpdates } from "@/hooks/useAvatarClusterUpdates";
import { BoostButton } from "@/components/BoostButton";
import { SuggestChangeModal } from "@/components/SuggestChangeModal";

import { RadiusSlider } from "@/components/RadiusSlider";
import { CreateFloqSheet } from "@/components/CreateFloqSheet";
import { DMQuickSheet } from "@/components/DMQuickSheet";
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
const FloqCard = ({ row, onJoin, onChat, onSuggestChange }: { 
  row: FloqRow; 
  onJoin: () => void;
  onChat: () => void;
  onSuggestChange: () => void;
}) => {
  const primary = vibeColor[row.vibe_tag] || vibeColor.social;
  const isStartingSoon = row.starts_in_min <= 30;

  // Format distance for display
  const formatDistance = (meters: number | null) => {
    if (!meters) return null;
    if (meters < 1000) return `${Math.round(meters)}m`;
    return `${(meters / 1000).toFixed(1)}km`;
  };

  return (
    <div className="bg-card/40 backdrop-blur-lg rounded-3xl p-6 border border-border/30 transition-all duration-300 hover:scale-[1.02] hover:translate-y-[-2px] hover:bg-card/60">
      <div className="flex items-center space-x-4 mb-6">
        <div 
          className="w-16 h-16 rounded-full flex items-center justify-center animate-pulse"
          style={{
            backgroundColor: primary + '1A',
            boxShadow: `0 0 30px ${primary}40`
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
            <span>Starts in {row.starts_in_min} min</span>
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

      {/* Action buttons with boost button */}
      <div className="grid grid-cols-2 gap-3 mb-3">
        <button 
          onClick={onJoin}
          className="bg-gradient-primary text-primary-foreground py-2 px-4 rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg text-sm"
        >
          Join
        </button>
        <button 
          onClick={onChat}
          className="bg-secondary/60 text-secondary-foreground py-2 px-4 rounded-xl font-semibold transition-all duration-300 hover:scale-105 hover:bg-secondary/80 text-sm"
        >
          Chat
        </button>
      </div>
      
      {/* Secondary actions */}
      <div className="grid grid-cols-2 gap-3">
        <div className="flex justify-center">
          <BoostButton 
            floqId={row.id} 
            boostCount={row.boost_count}
            size="sm"
            className="w-full justify-center"
          />
        </div>
        <button 
          onClick={onSuggestChange}
          className="bg-accent/20 text-accent border border-accent/30 py-2 px-4 rounded-xl font-medium transition-all duration-300 hover:scale-105 hover:bg-accent/30 text-sm"
        >
          Suggest Change
        </button>
      </div>
    </div>
  );
};

export const FloqsScreen = () => {
  const [debug] = useDebug();
  const [createFloqOpen, setCreateFloqOpen] = useState(false);
  const [dmSheetOpen, setDmSheetOpen] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  const [suggestChangeOpen, setSuggestChangeOpen] = useState(false);
  const [selectedFloqForSuggestion, setSelectedFloqForSuggestion] = useState<FloqRow | null>(null);
  
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
  const { data: floqs = [], isLoading } = useActiveFloqs({
    limit: 50,
    includeDistance: true
  });
  const { join, isPending } = useFloqJoin();
  
  // Enable real-time avatar cluster updates
  useAvatarClusterUpdates();

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
    join({ floqId });
  };

  const handleChat = (floq: FloqRow) => {
    // Get the first participant (creator) to start a DM
    const creator = floq.members[0];
    if (!creator) return;
    
    setSelectedFriendId(creator.id);
    setDmSheetOpen(true);
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
          onClick={() => setCreateFloqOpen(true)}
          className="h-10 w-10 rounded-xl bg-surface/30 backdrop-blur-sm border border-border/20 hover:bg-surface/50 transition-all duration-300 flex items-center justify-center"
        >
          <Plus size={20} className="text-muted-foreground" />
        </button>
      </div>

      {/* Radius Slider */}
      <div className="mb-6">
        <div className="bg-card/40 backdrop-blur-lg rounded-3xl border border-border/20">
          <RadiusSlider km={radiusKm} onChange={setRadiusKm} />
        </div>
      </div>

      {/* Loading State */}
      {isLoading && (
        <div className="text-center py-8">
          <div className="animate-pulse text-muted-foreground">Loading floqs...</div>
        </div>
      )}

      {/* No Floqs State */}
      {!isLoading && floqs.length === 0 && (
        <div className="text-center py-8">
          <p className="text-muted-foreground">No active floqs right now</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Check back later or create one!</p>
        </div>
      )}

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
            />
          ))}
        </div>
      )}

      {/* Bottom Navigation Spacer */}
      <div className="h-24"></div>

      {/* Create Floq Sheet */}
      <CreateFloqSheet 
        open={createFloqOpen} 
        onOpenChange={setCreateFloqOpen} 
      />

      {/* DM Quick Sheet */}
      <DMQuickSheet
        open={dmSheetOpen}
        onOpenChange={setDmSheetOpen}
        friendId={selectedFriendId}
      />

      {/* Suggest Change Modal */}
      <SuggestChangeModal
        open={suggestChangeOpen}
        onOpenChange={setSuggestChangeOpen}
        floqId={selectedFloqForSuggestion?.id || ''}
        currentVibe={selectedFloqForSuggestion?.vibe_tag || ''}
        currentTime={selectedFloqForSuggestion?.starts_at || ''}
      />
    </div>
  );
};
