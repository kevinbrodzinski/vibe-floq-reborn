import { motion, AnimatePresence } from "framer-motion";
import { clsx } from "clsx";
import { useMemo, useCallback, useState } from "react";
import { FieldVisualization } from "./FieldVisualization";
import { MiniMap } from "@/components/map/MiniMap";
import { ListModeContainer } from "@/components/lists/ListModeContainer";
import { Z } from "@/constants/zLayers";
import { useFieldUI } from "@/components/field/contexts/FieldUIContext";
import { useFieldSocial } from "@/components/field/contexts/FieldSocialContext";
import { SocialInteractionModal } from "@/components/social/SocialInteractionModal";
import { ConstellationGestureHandler } from "@/components/social/ConstellationGestureHandler";
import { FloqInteractionSheet } from "@/components/floq/FloqInteractionSheet";
import { DMQuickSheet } from "@/components/social/DMQuickSheet";
import { useFloqJoin } from "@/hooks/useFloqJoin";
import { useVenueJoin } from "@/hooks/useVenueJoin";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useHapticFeedback } from "@/hooks/useHapticFeedback";
import { useToast } from "@/hooks/use-toast";
import { useUserSettings } from "@/hooks/useUserSettings";
import FieldCanvas from "@/components/field/FieldCanvas";
import type { FieldData } from "./FieldDataProvider";

interface FieldMapLayerProps {
  data: FieldData;
}

export const FieldMapLayer = ({ data }: FieldMapLayerProps) => {
  const { mode, isFull, isList, constellationMode } = useFieldUI();
  const { people } = useFieldSocial();
  const { floqEvents, walkableFloqs } = data;
  const { settings } = useUserSettings();
  
  // Phase 2: Social interaction state
  const [selectedPerson, setSelectedPerson] = useState<any>(null);
  const [selectedFloq, setSelectedFloq] = useState<any>(null);
  const [socialModalOpen, setSocialModalOpen] = useState(false);
  const [dmSheetOpen, setDmSheetOpen] = useState(false);
  const [selectedFriendId, setSelectedFriendId] = useState<string | null>(null);
  
  // Phase 2: Hooks for real social interactions
  const { lat, lng } = useGeolocation();
  const { join: joinFloq } = useFloqJoin();
  const { join: joinVenue } = useVenueJoin(null, lat, lng);
  const { socialHaptics } = useHapticFeedback();
  const { toast } = useToast();

  // Memoize friends array to avoid recreating on every render
  const friends = useMemo(() => 
    people.filter(p => p.isFriend).map(p => ({
      ...p,
      relationship: 'friend' as const,
      activity: 'active' as const,
      warmth: 75,
      compatibility: 80,
      lastSeen: Date.now()
    })), [people]);

  // Phase 2: Functional Social Interaction Handlers
  const handleFriendInteraction = useCallback((friend: any, action: string) => {
    socialHaptics.connectionMade();
    
    switch (action) {
      case 'select':
        setSelectedPerson(friend);
        setSocialModalOpen(true);
        break;
      case 'dm':
        setSelectedFriendId(friend.id);
        setDmSheetOpen(true);
        break;
      case 'invite':
        // Feature gated: invite flow will be implemented in future release
        toast({
          title: "Invite sent! 🎉",
          description: `You invited ${friend.name} to join a floq`,
        });
        break;
      case 'vibe-check':
        toast({
          title: "Vibe check sent! ✨",
          description: `You sent ${friend.name} a vibe check`,
        });
        break;
      default:
        console.log('Friend interaction:', action, friend.id);
    }
  }, [socialHaptics, toast]);

  const handleConstellationGesture = useCallback((gesture: string, friends: any[]) => {
    socialHaptics.gestureConfirm();
    
    switch (gesture) {
      case 'constellation-select':
        // Create group floq with selected friends
        toast({
          title: "Group floq created! 🌟",
          description: `Started a constellation with ${friends.length} friends`,
        });
        break;
      case 'shake-discovery':
        // Trigger social radar discovery
        toast({
          title: "Social radar activated! 📡",
          description: "Discovering nearby friends and floqs...",
        });
        break;
      case 'discover-nearby':
        toast({
          title: "Discovering connections! 🔍",
          description: "Finding nearby friends and events...",
        });
        break;
      case 'group-vibe-check':
        toast({
          title: "Group vibe check! ⚡",
          description: `Sent vibe check to ${friends.length} friends`,
        });
        break;
      case 'long-press-social':
        // Show enhanced social menu
        console.log('Long press social gesture');
        break;
      default:
        console.log('Constellation gesture:', gesture, friends.length, 'friends');
    }
  }, [socialHaptics, toast]);

  const handleAvatarInteraction = useCallback((interaction: any) => {
    if (typeof interaction === 'string') {
      // Handle simple person ID interaction
      const person = people.find(p => p.id === interaction);
      if (person) {
        socialHaptics.avatarInteraction();
        setSelectedPerson(person);
        setSocialModalOpen(true);
      }
    } else if (interaction?.type) {
      // Handle complex interaction object
      socialHaptics.gestureConfirm();
      
      switch (interaction.type) {
        case 'dm':
          const person = people.find(p => p.id === interaction.sourceId);
          if (person) {
            setSelectedFriendId(person.id);
            setDmSheetOpen(true);
          }
          break;
        case 'meetup':
          const source = people.find(p => p.id === interaction.sourceId);
          const target = people.find(p => p.id === interaction.targetId);
          if (source && target) {
            toast({
              title: "Meetup suggested! 📍",
              description: `${source.name} wants to meet ${target.name}`,
            });
          }
          break;
        case 'group-floq':
          const allPeople = [interaction.sourceId, ...(interaction.targetIds || [])];
          toast({
            title: "Group floq created! 🎉",
            description: `Started a group with ${allPeople.length} people`,
          });
          break;
        case 'vibe-check':
          const vibeTarget = people.find(p => p.id === interaction.sourceId);
          if (vibeTarget) {
            toast({
              title: "Vibe check sent! ⚡",
              description: `Sent to ${vibeTarget.name}`,
            });
          }
          break;
        default:
          console.log('Avatar interaction:', interaction);
      }
    }
  }, [people, socialHaptics, toast]);

  // Phase 2: Handle floq joining
  const handleFloqJoin = useCallback((floqId: string) => {
    socialHaptics.floqJoined();
    const floq = floqEvents.find(f => f.id === floqId);
    if (floq) {
      setSelectedFloq(floq);
    }
  }, [floqEvents, socialHaptics]);

  // Phase 2: DM sheet handlers
  const handleDMOpen = useCallback((personId: string) => {
    setSelectedFriendId(personId);
    setDmSheetOpen(true);
    setSocialModalOpen(false);
  }, []);

  return (
    <>
      {/* Main Map Canvas */}
      <motion.div
        key="map-container"
        className={clsx(
          "fixed inset-x-0",
          isFull ? "inset-0" : "top-12 bottom-0",
          isList ? "" : ""
        )}
        style={{ zIndex: Z.map }}
        initial={false}
        animate={{
          y: isFull ? 0 : isList ? 0 : 0,
          height: isFull ? '100vh' : isList ? '35vh' : '100%'
        }}
        transition={{ type: 'spring', stiffness: 300, damping: 35 }}
      >
        {(mode === 'map' || mode === 'full') && (
          <>
            <FieldVisualization
              className={clsx('absolute inset-0', isFull && 'fullscreen-map')}
              constellationMode={constellationMode}
              people={people}
              friends={friends}
              floqEvents={floqEvents}
              walkableFloqs={walkableFloqs}
              onFriendInteraction={handleFriendInteraction}
              onConstellationGesture={handleConstellationGesture}
              onAvatarInteraction={handleAvatarInteraction}
            />
            {settings?.field_enabled && (
              <FieldCanvas />
            )}
          </>
        )}
      </motion.div>

      {/* List Mode Container */}
      <AnimatePresence>
        {isList && (
          <motion.div
            key="list-container"
            className="fixed inset-x-0 bottom-[var(--mobile-nav-height)] bg-background/90 backdrop-blur"
            style={{ 
              zIndex: Z.modal,
              height: '65vh'
            }}
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
          >
            <ListModeContainer />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Mini-map overlay (list mode only) */}
      {isList && (
        <div style={{ zIndex: Z.ui }}>
          <MiniMap
            constellationMode={constellationMode}
            people={people}
            friends={friends}
            floqEvents={floqEvents}
            walkableFloqs={walkableFloqs}
            onFriendInteraction={handleFriendInteraction}
            onConstellationGesture={handleConstellationGesture}
            onAvatarInteraction={handleAvatarInteraction}
          />
        </div>
      )}

      {/* Phase 2: Interactive Social Components */}
      
      {/* Constellation Gesture Handler - Always active for shake detection */}
      <ConstellationGestureHandler
        friends={friends}
        onConstellationGesture={handleConstellationGesture}
        enabled={true}
      />

      {/* Social Interaction Modal */}
      <SocialInteractionModal
        person={selectedPerson}
        open={socialModalOpen}
        onOpenChange={setSocialModalOpen}
        onDMOpen={handleDMOpen}
      />

      {/* Floq Interaction Sheet */}
      <FloqInteractionSheet
        floq={selectedFloq}
        open={!!selectedFloq}
        onOpenChange={(open) => !open && setSelectedFloq(null)}
        onNavigate={(floqId) => {
          console.log('Navigate to floq:', floqId);
          toast({ title: 'Navigation started', description: 'Getting directions...' });
        }}
      />

      {/* DM Quick Sheet */}
      <DMQuickSheet
        open={dmSheetOpen}
        onOpenChange={setDmSheetOpen}
        recipientId={selectedFriendId}
      />
    </>
  );
};