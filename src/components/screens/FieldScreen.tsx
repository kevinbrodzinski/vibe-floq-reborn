import { useState } from "react";
import { MapPin, Navigation, Plus, Sliders, Coffee, Zap, Users, Heart, Star, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { TimeStatusIndicator } from "@/components/TimeStatusIndicator";
import { useTimeSyncContext } from "@/components/TimeSyncProvider";
import { TimeWarpSlider } from "@/components/TimeWarpSlider";
import { AvatarInteractionLayer } from "@/components/AvatarInteractionLayer";
import { SocialGestureManager } from "@/components/SocialGestureManager";

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
  
  const [people] = useState<Person[]>([
    { id: "1", name: "Julia", x: 25, y: 30, color: "hsl(180 70% 60%)", vibe: "chill" },
    { id: "2", name: "Kayla", x: 35, y: 50, color: "hsl(240 70% 60%)", vibe: "social" },
    { id: "3", name: "Leo", x: 70, y: 35, color: "hsl(200 70% 60%)", vibe: "flowing" },
    { id: "4", name: "Kayla", x: 65, y: 65, color: "hsl(240 70% 60%)", vibe: "social" },
    { id: "5", name: "Leo", x: 75, y: 80, color: "hsl(200 70% 60%)", vibe: "open" },
  ]);

  const [floqEvents] = useState<FloqEvent[]>([
    { id: "1", title: "car nightride", x: 50, y: 45, size: 80, participants: 3, vibe: "hype" },
    { id: "2", title: "Gailleo's", x: 20, y: 70, size: 60, participants: 8, vibe: "social" },
    { id: "3", title: "Circa", x: 15, y: 85, size: 40, participants: 4, vibe: "chill" },
  ]);

  const getTimeBasedActionCard = () => {
    switch (timeState) {
      case 'dawn':
        return (
          <div className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 border border-border/30 glow-secondary">
            <div className="text-center mb-6">
              <h3 className="text-base text-muted-foreground">Gentle morning energy</h3>
              <h2 className="text-xl font-bold text-primary mt-1">Set your intention</h2>
            </div>
            <div className="flex space-x-3">
              <Button className="flex-1 gradient-secondary text-secondary-foreground py-3 px-4 rounded-2xl font-medium transition-smooth hover:glow-active flex items-center justify-center space-x-2">
                <Coffee className="w-4 h-4" />
                <span>Morning Ritual</span>
              </Button>
              <Button variant="secondary" className="flex-1 py-3 px-4 rounded-2xl font-medium transition-smooth hover:glow-secondary flex items-center justify-center space-x-2">
                <Sparkles className="w-4 h-4" />
                <span>Set Vibe</span>
              </Button>
            </div>
          </div>
        );
      
      case 'morning':
        return (
          <div className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 border border-border/30 glow-secondary">
            <div className="text-center mb-6">
              <h3 className="text-base text-muted-foreground">Energetic clarity</h3>
              <h2 className="text-xl font-bold text-primary mt-1">Connect & create</h2>
            </div>
            <div className="flex space-x-3">
              <Button className="flex-1 gradient-secondary text-secondary-foreground py-3 px-4 rounded-2xl font-medium transition-smooth hover:glow-active flex items-center justify-center space-x-2">
                <Zap className="w-4 h-4" />
                <span>Find Energy</span>
              </Button>
              <Button variant="secondary" className="flex-1 py-3 px-4 rounded-2xl font-medium transition-smooth hover:glow-secondary flex items-center justify-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Start Something</span>
              </Button>
            </div>
          </div>
        );
      
      case 'afternoon':
        return (
          <div className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 border border-border/30 glow-secondary">
            <div className="text-center mb-6">
              <h3 className="text-base text-muted-foreground">Steady focus</h3>
              <h2 className="text-xl font-bold text-primary mt-1">Check the pulse</h2>
            </div>
            <div className="flex space-x-3">
              <Button className="flex-1 gradient-secondary text-secondary-foreground py-3 px-4 rounded-2xl font-medium transition-smooth hover:glow-active flex items-center justify-center space-x-2">
                <Users className="w-4 h-4" />
                <span>See Who's Around</span>
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                className="py-3 px-4 rounded-2xl transition-smooth hover:glow-active"
                onClick={() => setShowTimeWarp(true)}
              >
                <Sliders className="w-4 h-4" />
              </Button>
            </div>
          </div>
        );
      
      case 'evening':
      case 'night':
        return (
          <div className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 border border-border/30 glow-secondary">
            <div className="text-center mb-6">
              <h3 className="text-base text-muted-foreground">3 friends are vibing at</h3>
              <h2 className="text-xl font-bold text-primary mt-1">Warehouse — join?</h2>
            </div>
            <div className="flex space-x-3">
              <Button className="flex-1 gradient-secondary text-secondary-foreground py-3 px-4 rounded-2xl font-medium transition-smooth hover:glow-active flex items-center justify-center space-x-2">
                <Navigation className="w-4 h-4" />
                <span>Let Pulse Guide Me</span>
              </Button>
              <Button variant="secondary" className="flex-1 py-3 px-4 rounded-2xl font-medium transition-smooth hover:glow-secondary flex items-center justify-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Create New Floq</span>
              </Button>
              <Button 
                variant="outline" 
                size="icon" 
                className="py-3 px-4 rounded-2xl transition-smooth hover:glow-active"
                onClick={() => setShowTimeWarp(true)}
              >
                <Sliders className="w-4 h-4" />
              </Button>
            </div>
          </div>
        );
      
      case 'late':
        return (
          <div className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 border border-border/30 glow-secondary">
            <div className="text-center mb-6">
              <h3 className="text-base text-muted-foreground">Intimate reflection</h3>
              <h2 className="text-xl font-bold text-primary mt-1">Close connections</h2>
            </div>
            <div className="flex space-x-3">
              <Button className="flex-1 gradient-secondary text-secondary-foreground py-3 px-4 rounded-2xl font-medium transition-smooth hover:glow-active flex items-center justify-center space-x-2">
                <Heart className="w-4 h-4" />
                <span>Intimate Circle</span>
              </Button>
              <Button variant="secondary" className="flex-1 py-3 px-4 rounded-2xl font-medium transition-smooth hover:glow-secondary flex items-center justify-center space-x-2">
                <Star className="w-4 h-4" />
                <span>Reflect</span>
              </Button>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  const handleSocialAction = (action: any) => {
    console.log('Social action triggered:', action);
    // Handle various social actions from gestures
    switch (action.type) {
      case 'shake-pulse':
        // Show active friends with pulse effect
        break;
      case 'social-radar':
        // Show social connections
        break;
      case 'quick-join':
        // Find and join nearby floqs
        break;
      case 'vibe-broadcast':
        // Broadcast current vibe
        break;
    }
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
      <div className="absolute top-0 left-0 right-0 z-10 flex justify-between items-center p-6 pt-12">
        <Button variant="ghost" className="flex items-center space-x-2 text-foreground hover:glow-secondary">
          <MapPin className="w-4 h-4 text-primary" />
          <span className="text-sm font-medium">Downtown</span>
        </Button>
        
        <div className="text-4xl font-light glow-primary">
          floq
        </div>
        
        <div className="w-12 h-12 rounded-full gradient-secondary border-2 border-primary/30 glow-secondary overflow-hidden cursor-pointer hover:scale-105 transition-smooth">
          <div className="w-full h-full bg-muted-foreground/10"></div>
        </div>
      </div>

      {/* Time-Synced Status Bar */}
      <div className="absolute top-24 left-0 right-0 z-10 text-center pt-4">
        <TimeStatusIndicator />
      </div>

      {/* Time-Based Module Indicators */}
      <div className="absolute top-40 left-6 right-6 z-10">
        {/* Dawn Module */}
        <div className="time-module-dawn mb-2">
          <div className="bg-primary/10 backdrop-blur-xl rounded-2xl p-3 border border-primary/20 text-center">
            <span className="text-xs text-primary font-medium">🌅 Gentle awakening — set your flow</span>
          </div>
        </div>
        
        {/* Morning Module */}
        <div className="time-module-morning mb-2">
          <div className="bg-primary/10 backdrop-blur-xl rounded-2xl p-3 border border-primary/20 text-center">
            <span className="text-xs text-primary font-medium">☀️ Energy rising — connect & create</span>
          </div>
        </div>
        
        {/* Afternoon Module */}
        <div className="time-module-afternoon mb-2">
          <div className="bg-primary/10 backdrop-blur-xl rounded-2xl p-3 border border-primary/20 text-center">
            <span className="text-xs text-primary font-medium">🌤️ Steady focus — check the pulse</span>
          </div>
        </div>
        
        {/* Evening/Night Module */}
        <div className="time-module-evening time-module-night mb-2">
          <div className="bg-primary/10 backdrop-blur-xl rounded-2xl p-3 border border-primary/20 text-center">
            <span className="text-xs text-primary font-medium">🌆 Social flow — peak connection time</span>
          </div>
        </div>
        
        {/* Late Module */}
        <div className="time-module-late mb-2">
          <div className="bg-primary/10 backdrop-blur-xl rounded-2xl p-3 border border-primary/20 text-center">
            <span className="text-xs text-primary font-medium">🌙 Intimate reflection — close connections</span>
          </div>
        </div>
      </div>

      {/* Field Map */}
      <div className="relative h-full pt-48 pb-32">
        {/* People on the field */}
        {people.map((person, index) => (
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
          onInteraction={handleAvatarInteraction}
        />
      </div>

      {/* Social Gesture Manager */}
      <SocialGestureManager onSocialAction={handleSocialAction} />

      {/* Time Warp Slider */}
      <TimeWarpSlider 
        isVisible={showTimeWarp}
        onClose={() => setShowTimeWarp(false)}
        onTimeChange={handleTimeWarpChange}
      />

      {/* Time-Based Bottom Action Card */}
      <div className="absolute bottom-24 left-4 right-4 z-10">
        {getTimeBasedActionCard()}
      </div>
    </div>
  );
};