import { FriendConstellation } from "@/components/FriendConstellation";
import { AvatarInteractionLayer } from "@/components/AvatarInteractionLayer";

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

interface Friend {
  id: string;
  name: string;
  x: number;
  y: number;
  color: string;
  vibe: string;
  relationship: 'close' | 'friend' | 'acquaintance';
  activity: 'active' | 'idle' | 'away';
  warmth: number;
  compatibility: number;
  lastSeen: number;
}

interface FieldVisualizationProps {
  constellationMode: boolean;
  people: Person[];
  friends: Friend[];
  floqEvents: FloqEvent[];
  onFriendInteraction: (friend: any, action: string) => void;
  onConstellationGesture: (gesture: string, friends: any[]) => void;
  onAvatarInteraction: (interaction: any) => void;
}

export const FieldVisualization = ({
  constellationMode,
  people,
  friends,
  floqEvents,
  onFriendInteraction,
  onConstellationGesture,
  onAvatarInteraction
}: FieldVisualizationProps) => {
  return (
    <div className="relative h-full pt-48 pb-32">
      {/* Friend Constellation System */}
      {constellationMode && (
        <FriendConstellation
          friends={friends}
          centerX={50}
          centerY={50}
          onFriendInteraction={onFriendInteraction}
          onConstellationGesture={onConstellationGesture}
        />
      )}

      {/* People on the field (when not in constellation mode) */}
      {!constellationMode && people.map((person, index) => (
        <div
          key={person.id}
          className="absolute transition-all duration-500 cursor-pointer hover:scale-110"
          style={{
            left: `${person.x}%`,
            top: `${person.y}%`,
            transform: "translate(-50%, -50%)",
            animationDelay: `${index * 0.1}s`,
          }}
        >
          <div
            className="w-4 h-4 rounded-full animate-pulse-glow"
            style={{
              backgroundColor: person.color,
              boxShadow: `0 0 20px ${person.color}`,
            }}
          ></div>
          <div className="text-sm text-center mt-2 text-foreground/90">
            {person.name}
          </div>
        </div>
      ))}

      {/* Floq Events */}
      {floqEvents.map((event, index) => (
        <div
          key={event.id}
          className="absolute transition-all duration-500 cursor-pointer hover:scale-105 group"
          style={{
            left: `${event.x}%`,
            top: `${event.y}%`,
            transform: "translate(-50%, -50%)",
            width: `${event.size}px`,
            height: `${event.size}px`,
            animationDelay: `${index * 0.2}s`,
          }}
        >
          <div className="relative w-full h-full animate-fade-in">
            {/* Outer ripple ring */}
            <div className="absolute inset-0 border-2 border-primary/20 rounded-full animate-pulse group-hover:border-primary/40"></div>
            {/* Middle ring */}
            <div className="absolute inset-2 border border-accent/30 rounded-full"></div>
            {/* Inner glowing core */}
            <div 
              className="absolute inset-6 rounded-full animate-pulse-glow group-hover:glow-active"
              style={{
                backgroundColor: event.vibe === 'hype' ? 'hsl(280 70% 60%)' : 
                                 event.vibe === 'social' ? 'hsl(30 70% 60%)' : 
                                 'hsl(240 70% 60%)',
                boxShadow: `0 0 30px ${event.vibe === 'hype' ? 'hsl(280 70% 60%)' : 
                                      event.vibe === 'social' ? 'hsl(30 70% 60%)' : 
                                      'hsl(240 70% 60%)'}40`
              }}
            ></div>
          </div>
          <div className="text-sm text-center mt-2 text-foreground font-medium group-hover:text-primary transition-smooth">
            {event.title}
          </div>
        </div>
      ))}

      {/* Avatar Interaction Layer */}
      <AvatarInteractionLayer 
        people={people}
        onInteraction={onAvatarInteraction}
      />
    </div>
  );
};