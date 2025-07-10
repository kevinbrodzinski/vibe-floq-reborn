import { useState, useEffect, useCallback } from 'react';
import { useTimeSyncContext } from './TimeSyncProvider';
import { useHapticFeedback } from '@/hooks/useHapticFeedback';

interface Friend {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
  vibe: string;
  relationship: 'close' | 'friend' | 'acquaintance';
  activity: 'active' | 'idle' | 'away';
  warmth: number; // 0-100
  compatibility: number; // 0-100
  lastSeen: number;
}

interface ConstellationProps {
  friends: Friend[];
  centerX?: number;
  centerY?: number;
  onFriendInteraction?: (friend: Friend, action: string) => void;
  onConstellationGesture?: (gesture: string, friends: Friend[]) => void;
}

export const FriendConstellation = ({
  friends,
  centerX = 50,
  centerY = 50,
  onFriendInteraction,
  onConstellationGesture
}: ConstellationProps) => {
  const { timeState } = useTimeSyncContext();
  const { socialHaptics } = useHapticFeedback();
  const [orbitalPositions, setOrbitalPositions] = useState<{ [key: string]: { angle: number; radius: number; x: number; y: number } }>({});
  const [energyFlows, setEnergyFlows] = useState<{ from: string; to: string; intensity: number }[]>([]);
  const [constellationGroups, setConstellationGroups] = useState<{ [key: string]: Friend[] }>({});

  // Calculate orbital positions based on relationship strength
  const calculateOrbitalPosition = useCallback((friend: Friend, index: number) => {
    const baseRadius = friend.relationship === 'close' ? 120 : 
                      friend.relationship === 'friend' ? 180 : 240;
    
    // Time-based orbital shifts
    const timeModifier = timeState === 'evening' || timeState === 'night' ? 0.8 : 1.0;
    const radius = baseRadius * timeModifier;
    
    // Distribute friends around the orbit
    const angle = (index * (360 / friends.length)) + (Date.now() / 10000) % 360;
    const radian = (angle * Math.PI) / 180;
    
    const x = centerX + Math.cos(radian) * (radius / 4);
    const y = centerY + Math.sin(radian) * (radius / 4);
    
    return { angle, radius, x, y };
  }, [friends.length, centerX, centerY, timeState]);

  // Update orbital positions
  useEffect(() => {
    const newPositions: { [key: string]: { angle: number; radius: number; x: number; y: number } } = {};
    
    friends.forEach((friend, index) => {
      newPositions[friend.id] = calculateOrbitalPosition(friend, index);
    });
    
    setOrbitalPositions(newPositions);
  }, [friends, calculateOrbitalPosition]);

  // Generate energy flows between compatible friends
  useEffect(() => {
    const flows: { from: string; to: string; intensity: number }[] = [];
    
    friends.forEach(friend1 => {
      friends.forEach(friend2 => {
        if (friend1.id !== friend2.id && friend1.compatibility > 70 && friend2.compatibility > 70) {
          const distance = Math.sqrt(
            Math.pow(orbitalPositions[friend1.id]?.x - orbitalPositions[friend2.id]?.x, 2) +
            Math.pow(orbitalPositions[friend1.id]?.y - orbitalPositions[friend2.id]?.y, 2)
          );
          
          if (distance < 30) {
            flows.push({
              from: friend1.id,
              to: friend2.id,
              intensity: (friend1.compatibility + friend2.compatibility) / 200
            });
          }
        }
      });
    });
    
    setEnergyFlows(flows);
  }, [friends, orbitalPositions]);

  // Auto-generate constellation groups
  useEffect(() => {
    const groups: { [key: string]: Friend[] } = {};
    const processedFriends = new Set<string>();
    
    friends.forEach(friend => {
      if (processedFriends.has(friend.id)) return;
      
      const nearbyFriends = friends.filter(other => {
        if (other.id === friend.id || processedFriends.has(other.id)) return false;
        
        const pos1 = orbitalPositions[friend.id];
        const pos2 = orbitalPositions[other.id];
        
        if (!pos1 || !pos2) return false;
        
        const distance = Math.sqrt(
          Math.pow(pos1.x - pos2.x, 2) + Math.pow(pos1.y - pos2.y, 2)
        );
        
        return distance < 25 && friend.compatibility > 60 && other.compatibility > 60;
      });
      
      if (nearbyFriends.length > 0) {
        const groupName = `${friend.name}'s Constellation`;
        groups[groupName] = [friend, ...nearbyFriends];
        
        [friend, ...nearbyFriends].forEach(f => processedFriends.add(f.id));
      }
    });
    
    setConstellationGroups(groups);
  }, [friends, orbitalPositions]);

  const getActivityColor = (activity: string) => {
    switch (activity) {
      case 'active': return 'hsl(120 70% 60%)';
      case 'idle': return 'hsl(60 70% 60%)';
      case 'away': return 'hsl(0 0% 50%)';
      default: return 'hsl(0 0% 50%)';
    }
  };

  const getRelationshipIntensity = (relationship: string) => {
    switch (relationship) {
      case 'close': return 1.0;
      case 'friend': return 0.7;
      case 'acquaintance': return 0.4;
      default: return 0.2;
    }
  };

  const handleFriendClick = (friend: Friend) => {
    socialHaptics.connectionMade();
    onFriendInteraction?.(friend, 'select');
  };

  const handleConstellationClick = (groupName: string, friends: Friend[]) => {
    socialHaptics.gestureConfirm();
    onConstellationGesture?.('constellation-select', friends);
  };

  return (
    <div className="absolute inset-0 pointer-events-none">
      {/* Energy Flow Lines */}
      {energyFlows.map((flow, index) => {
        const fromPos = orbitalPositions[flow.from];
        const toPos = orbitalPositions[flow.to];
        
        if (!fromPos || !toPos) return null;
        
        return (
          <svg
            key={`flow-${index}`}
            className="absolute inset-0 pointer-events-none"
            style={{ zIndex: 1 }}
          >
            <defs>
              <linearGradient id={`gradient-${index}`} x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
                <stop offset="50%" stopColor="hsl(var(--accent))" stopOpacity="0.8" />
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.6" />
              </linearGradient>
            </defs>
            <line
              x1={`${fromPos.x}%`}
              y1={`${fromPos.y}%`}
              x2={`${toPos.x}%`}
              y2={`${toPos.y}%`}
              stroke={`url(#gradient-${index})`}
              strokeWidth="2"
              className="animate-pulse"
            />
          </svg>
        );
      })}

      {/* Friend Avatars with Orbital System */}
      {friends.map((friend) => {
        const position = orbitalPositions[friend.id];
        if (!position) return null;

        const intensity = getRelationshipIntensity(friend.relationship);
        const activityColor = getActivityColor(friend.activity);

        return (
          <div key={friend.id} className="absolute pointer-events-auto">
            {/* Warmth Ring */}
            <div
              className="absolute animate-pulse"
              style={{
                left: `${position.x}%`,
                top: `${position.y}%`,
                transform: 'translate(-50%, -50%)',
                width: `${friend.warmth}px`,
                height: `${friend.warmth}px`,
                border: `2px solid ${friend.color}40`,
                borderRadius: '50%',
                zIndex: 2,
              }}
            />

            {/* Activity Pulse Ring */}
            <div
              className="absolute animate-ping"
              style={{
                left: `${position.x}%`,
                top: `${position.y}%`,
                transform: 'translate(-50%, -50%)',
                width: `${20 + friend.warmth * 0.3}px`,
                height: `${20 + friend.warmth * 0.3}px`,
                border: `1px solid ${activityColor}`,
                borderRadius: '50%',
                zIndex: 3,
                animationDuration: friend.activity === 'active' ? '1s' : '3s',
              }}
            />

            {/* Friend Avatar with Halo */}
            <div
              className="absolute cursor-pointer transition-all duration-300 hover:scale-110"
              style={{
                left: `${position.x}%`,
                top: `${position.y}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: 4,
              }}
              onClick={() => handleFriendClick(friend)}
            >
              {/* Friend Halo */}
              <div
                className="absolute inset-0 rounded-full animate-pulse"
                style={{
                  borderWidth: '2px',
                  borderStyle: 'solid',
                  borderColor: friend.color,
                  transform: 'scale(1.3)',
                }}
              />
              
              <div
                className="w-8 h-8 rounded-full border-2 transition-all duration-300 relative"
                style={{
                  backgroundColor: friend.color,
                  borderColor: activityColor,
                  boxShadow: `0 0 ${friend.warmth * 0.2}px ${friend.color}60`,
                  opacity: intensity,
                }}
              />
              <div className="text-xs text-center mt-1 text-foreground/80 font-medium">
                {friend.name}
              </div>
            </div>

            {/* Orbital Ring */}
            <div
              className="absolute border border-primary/20 rounded-full pointer-events-none"
              style={{
                left: `${centerX}%`,
                top: `${centerY}%`,
                transform: 'translate(-50%, -50%)',
                width: `${position.radius / 2}px`,
                height: `${position.radius / 2}px`,
                zIndex: 1,
              }}
            />
          </div>
        );
      })}

      {/* Constellation Group Indicators */}
      {Object.entries(constellationGroups).map(([groupName, groupFriends], index) => {
        if (groupFriends.length < 2) return null;

        // Calculate constellation center
        const centerX = groupFriends.reduce((sum, friend) => 
          sum + (orbitalPositions[friend.id]?.x || 0), 0) / groupFriends.length;
        const centerY = groupFriends.reduce((sum, friend) => 
          sum + (orbitalPositions[friend.id]?.y || 0), 0) / groupFriends.length;

        return (
          <div
            key={groupName}
            className="absolute pointer-events-auto cursor-pointer"
            style={{
              left: `${centerX}%`,
              top: `${centerY}%`,
              transform: 'translate(-50%, -50%)',
              zIndex: 5,
            }}
            onClick={() => handleConstellationClick(groupName, groupFriends)}
          >
            <div className="bg-card/80 backdrop-blur-xl rounded-full px-3 py-1 border border-primary/30 hover:border-primary/60 transition-colors">
              <span className="text-xs text-primary font-medium">
                ✨ {groupFriends.length} friends
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};