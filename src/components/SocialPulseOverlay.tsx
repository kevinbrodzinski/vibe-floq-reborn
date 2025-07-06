import { useState, useEffect } from "react";
import { TrendingUp, Users, MapPin, Clock, Zap, Heart } from "lucide-react";

interface SocialPulseData {
  id: string;
  type: 'friend_activity' | 'venue_trending' | 'group_momentum' | 'opportunity';
  title: string;
  description: string;
  location?: string;
  timestamp: number;
  priority: 'low' | 'medium' | 'high';
  actionable: boolean;
  friendsInvolved?: string[];
  venueId?: string;
}

interface SocialPulseOverlayProps {
  isPlanning: boolean;
  currentPlan: any;
}

export const SocialPulseOverlay = ({ isPlanning, currentPlan }: SocialPulseOverlayProps) => {
  const [pulseData, setPulseData] = useState<SocialPulseData[]>([
    {
      id: "pulse-1",
      type: "friend_activity",
      title: "Emma just checked in at Bestia",
      description: "She's there now with 3 friends - perfect timing!",
      location: "Arts District",
      timestamp: Date.now() - 300000,
      priority: "high",
      actionable: true,
      friendsInvolved: ["emma"],
      venueId: "venue-1"
    },
    {
      id: "pulse-2", 
      type: "venue_trending",
      title: "EP & LP getting busy",
      description: "Crowd level increasing - book ahead",
      location: "West Hollywood",
      timestamp: Date.now() - 180000,
      priority: "medium",
      actionable: true,
      venueId: "venue-2"
    },
    {
      id: "pulse-3",
      type: "group_momentum",
      title: "Your group energy is rising",
      description: "3 of 4 people confirmed - lock in the plan!",
      timestamp: Date.now() - 120000,
      priority: "high",
      actionable: true
    },
    {
      id: "pulse-4",
      type: "opportunity",
      title: "Jake's group looking for another crew",
      description: "They're planning the same route tonight",
      location: "West Hollywood",
      timestamp: Date.now() - 60000,
      priority: "medium",
      actionable: true,
      friendsInvolved: ["jake"]
    }
  ]);

  const [visiblePulses, setVisiblePulses] = useState<SocialPulseData[]>([]);

  // Simulate real-time pulse updates
  useEffect(() => {
    if (!isPlanning) return;

    const interval = setInterval(() => {
      // Show new pulses periodically
      const unshownPulses = pulseData.filter(pulse => 
        !visiblePulses.some(visible => visible.id === pulse.id)
      );

      if (unshownPulses.length > 0 && Math.random() > 0.7) {
        const nextPulse = unshownPulses[0];
        setVisiblePulses(prev => [...prev, nextPulse].slice(-3)); // Keep max 3 visible
      }

      // Remove old pulses
      setVisiblePulses(prev => 
        prev.filter(pulse => Date.now() - pulse.timestamp < 300000) // Remove after 5 minutes
      );

      // Generate new pulse data occasionally
      if (Math.random() > 0.9) {
        const newPulses = [
          {
            id: `pulse-${Date.now()}`,
            type: "friend_activity" as const,
            title: "Sarah posted from The Edison",
            description: "The music is incredible tonight 🎵",
            location: "Downtown",
            timestamp: Date.now(),
            priority: "low" as const,
            actionable: false,
            friendsInvolved: ["sarah"]
          },
          {
            id: `pulse-${Date.now() + 1}`,
            type: "venue_trending" as const, 
            title: "Catch LA wait time: 45 min",
            description: "Consider adjusting your timeline",
            location: "West Hollywood",
            timestamp: Date.now(),
            priority: "medium" as const,
            actionable: true,
            venueId: "venue-5"
          }
        ];

        setPulseData(prev => [...prev, ...newPulses]);
      }
    }, 8000);

    return () => clearInterval(interval);
  }, [isPlanning, pulseData, visiblePulses]);

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'hsl(0 70% 60%)';
      case 'medium': return 'hsl(60 70% 60%)';
      case 'low': return 'hsl(120 70% 60%)';
      default: return 'hsl(0 0% 50%)';
    }
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'friend_activity': return <Heart className="w-4 h-4" />;
      case 'venue_trending': return <TrendingUp className="w-4 h-4" />;
      case 'group_momentum': return <Users className="w-4 h-4" />;
      case 'opportunity': return <Zap className="w-4 h-4" />;
      default: return <MapPin className="w-4 h-4" />;
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const minutes = Math.floor((Date.now() - timestamp) / 60000);
    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    return `${hours}h ago`;
  };

  if (!isPlanning || visiblePulses.length === 0) return null;

  return (
    <div className="fixed top-20 right-4 z-40 space-y-3 w-80">
      {visiblePulses.map((pulse, index) => (
        <div
          key={pulse.id}
          className="bg-card/95 backdrop-blur-xl rounded-2xl p-4 border border-border/30 transition-all duration-500 hover:scale-[1.02] animate-fade-in shadow-lg"
          style={{ 
            animationDelay: `${index * 100}ms`,
            boxShadow: `0 0 20px ${getPriorityColor(pulse.priority)}20`
          }}
        >
          <div className="flex items-start space-x-3">
            <div 
              className="p-2 rounded-full"
              style={{ backgroundColor: `${getPriorityColor(pulse.priority)}20` }}
            >
              <div style={{ color: getPriorityColor(pulse.priority) }}>
                {getTypeIcon(pulse.type)}
              </div>
            </div>
            
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between mb-1">
                <h4 className="text-sm font-semibold text-foreground truncate">
                  {pulse.title}
                </h4>
                <span className="text-xs text-muted-foreground whitespace-nowrap ml-2">
                  {formatTimeAgo(pulse.timestamp)}
                </span>
              </div>
              
              <p className="text-xs text-muted-foreground mb-2">
                {pulse.description}
              </p>
              
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2 text-xs text-accent">
                  {pulse.location && (
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-3 h-3" />
                      <span>{pulse.location}</span>
                    </div>
                  )}
                  {pulse.friendsInvolved && (
                    <div className="flex items-center space-x-1">
                      <Users className="w-3 h-3" />
                      <span>{pulse.friendsInvolved.length} friends</span>
                    </div>
                  )}
                </div>
                
                {pulse.actionable && (
                  <button 
                    className="text-xs px-2 py-1 bg-gradient-primary text-primary-foreground rounded-full hover:scale-110 transition-all duration-300"
                    onClick={() => {
                      // Handle pulse action
                      setVisiblePulses(prev => prev.filter(p => p.id !== pulse.id));
                    }}
                  >
                    Act
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};