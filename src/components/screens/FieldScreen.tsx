import { useState } from "react";
import { TimeStatusIndicator } from "@/components/TimeStatusIndicator";
import { useTimeSyncContext } from "@/components/TimeSyncProvider";
import { TimeWarpSlider } from "@/components/TimeWarpSlider";
import { SocialGestureManager } from "@/components/SocialGestureManager";
import { FieldHeader } from "./field/FieldHeader";
import { TimeModuleIndicators } from "./field/TimeModuleIndicators";
import { FieldVisualization } from "./field/FieldVisualization";
import { ConstellationControls } from "./field/ConstellationControls";
import { TimeBasedActionCard } from "./field/TimeBasedActionCard";

interface Person {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
  vibe: string;
}

interface FloqEvent {
  id: string;
  title: string;
  x: number;
  y: number;
  size: number;
  participants: number;
  vibe: string;
}

export const FieldScreen = () => {
  const { timeState, shouldShowModule } = useTimeSyncContext();
  const [showTimeWarp, setShowTimeWarp] = useState(false);
  const [currentTimeWarpData, setCurrentTimeWarpData] = useState<any>(null);
  const [constellationMode, setConstellationMode] = useState(false);
  
  const [people] = useState<Person[]>([
    { id: "1", name: "Julia", x: 25, y: 30, color: "hsl(180 70% 60%)", vibe: "chill" },
    { id: "2", name: "Kayla", x: 35, y: 50, color: "hsl(240 70% 60%)", vibe: "social" },
    { id: "3", name: "Leo", x: 70, y: 35, color: "hsl(200 70% 60%)", vibe: "flowing" },
    { id: "4", name: "Kayla", x: 65, y: 65, color: "hsl(240 70% 60%)", vibe: "social" },
    { id: "5", name: "Leo", x: 75, y: 80, color: "hsl(200 70% 60%)", vibe: "open" },
  ]);

  // Convert people to friends for constellation system
  const [friends] = useState([
    { 
      id: "1", name: "Julia", x: 25, y: 30, color: "hsl(180 70% 60%)", vibe: "chill",
      relationship: 'close' as const, activity: 'active' as const, warmth: 85, compatibility: 92, lastSeen: Date.now() - 300000
    },
    { 
      id: "2", name: "Kayla", x: 35, y: 50, color: "hsl(240 70% 60%)", vibe: "social",
      relationship: 'friend' as const, activity: 'active' as const, warmth: 70, compatibility: 88, lastSeen: Date.now() - 180000
    },
    { 
      id: "3", name: "Leo", x: 70, y: 35, color: "hsl(200 70% 60%)", vibe: "flowing",
      relationship: 'close' as const, activity: 'idle' as const, warmth: 90, compatibility: 95, lastSeen: Date.now() - 120000
    },
    { 
      id: "4", name: "Emma", x: 65, y: 65, color: "hsl(320 70% 60%)", vibe: "social",
      relationship: 'friend' as const, activity: 'active' as const, warmth: 75, compatibility: 80, lastSeen: Date.now() - 60000
    },
    { 
      id: "5", name: "Alex", x: 75, y: 80, color: "hsl(280 70% 60%)", vibe: "open",
      relationship: 'acquaintance' as const, activity: 'away' as const, warmth: 45, compatibility: 65, lastSeen: Date.now() - 900000
    },
  ]);

  const [floqEvents] = useState<FloqEvent[]>([
    { id: "1", title: "car nightride", x: 50, y: 45, size: 80, participants: 3, vibe: "hype" },
    { id: "2", title: "Gailleo's", x: 20, y: 70, size: 60, participants: 8, vibe: "social" },
    { id: "3", title: "Circa", x: 15, y: 85, size: 40, participants: 4, vibe: "chill" },
  ]);

  // Moved to TimeBasedActionCard component

  const handleSocialAction = (action: any) => {
    console.log('Social action triggered:', action);
    // Handle various social actions from gestures
    switch (action.type) {
      case 'shake-pulse':
        // Show active friends with pulse effect
        setConstellationMode(true);
        break;
      case 'social-radar':
        // Show social connections
        setConstellationMode(!constellationMode);
        break;
      case 'quick-join':
        // Find and join nearby floqs
        break;
      case 'vibe-broadcast':
        // Broadcast current vibe
        break;
    }
  };

  const handleConstellationAction = (action: any) => {
    console.log('Constellation action:', action);
    switch (action.type) {
      case 'orbital-adjust':
        // Handle orbital adjustments
        break;
      case 'constellation-create':
        // Create new constellation group
        break;
      case 'energy-share':
        // Share energy between friends
        break;
      case 'group-plan':
        // Start group planning mode
        break;
      case 'temporal-view':
        setShowTimeWarp(true);
        break;
    }
  };

  const handleOrbitalAdjustment = (direction: 'expand' | 'contract', intensity: number) => {
    console.log('Orbital adjustment:', direction, intensity);
    // Handle orbital distance changes
  };

  const handleEnergyShare = (fromId: string, toId: string, energy: number) => {
    console.log('Energy sharing:', fromId, 'to', toId, 'energy:', energy);
    // Handle energy sharing between friends
  };

  const handleFriendInteraction = (friend: any, action: string) => {
    console.log('Friend interaction:', friend.name, action);
    // Handle friend-specific interactions
  };

  const handleConstellationGesture = (gesture: string, friends: any[]) => {
    console.log('Constellation gesture:', gesture, friends.length, 'friends');
    // Handle constellation-level gestures
  };

  const handleAvatarInteraction = (interaction: any) => {
    console.log('Avatar interaction:', interaction);
    // Handle avatar-to-avatar interactions
  };

  const handleTimeWarpChange = (hour: number, data: any) => {
    setCurrentTimeWarpData(data);
    console.log('Time warp:', hour, data);
  };

  return (
    <div className="relative h-screen overflow-hidden">
      {/* Header */}
      <FieldHeader />

      {/* Time-Synced Status Bar */}
      <div className="absolute top-24 left-0 right-0 z-10 text-center pt-4">
        <TimeStatusIndicator />
      </div>

      {/* Time-Based Module Indicators */}
      <TimeModuleIndicators />

      {/* Field Map */}
      <FieldVisualization
        constellationMode={constellationMode}
        people={people}
        friends={friends}
        floqEvents={floqEvents}
        onFriendInteraction={handleFriendInteraction}
        onConstellationGesture={handleConstellationGesture}
        onAvatarInteraction={handleAvatarInteraction}
      />

      {/* Social Gesture Manager */}
      <SocialGestureManager onSocialAction={handleSocialAction} />

      {/* Constellation Controls */}
      <ConstellationControls
        timeState={timeState}
        constellationMode={constellationMode}
        onConstellationToggle={() => setConstellationMode(!constellationMode)}
        onConstellationAction={handleConstellationAction}
        onOrbitalAdjustment={handleOrbitalAdjustment}
        onEnergyShare={handleEnergyShare}
      />

      {/* Time Warp Slider */}
      <TimeWarpSlider 
        isVisible={showTimeWarp}
        onClose={() => setShowTimeWarp(false)}
        onTimeChange={handleTimeWarpChange}
      />

      {/* Time-Based Bottom Action Card */}
      <div className="absolute bottom-24 left-4 right-4 z-10">
        <TimeBasedActionCard
          timeState={timeState}
          onTimeWarpToggle={() => setShowTimeWarp(true)}
        />
      </div>
    </div>
  );
};