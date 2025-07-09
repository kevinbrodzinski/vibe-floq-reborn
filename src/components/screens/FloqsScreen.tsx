import { useState, useEffect } from "react";
import { Search, Plus, Armchair, MessageCircle } from "lucide-react";
import { useGeolocation } from "@/hooks/useGeolocation";
import { useNearbyFloqs } from "@/hooks/useNearbyFloqs";
import { RadiusSlider } from "@/components/RadiusSlider";

interface FloqCard {
  id: string;
  title: string;
  type: string;
  description: string;
  startTime: string;
  location: string;
  participants: number;
  vibeMatch: number;
  status: "open" | "sunset" | "closed";
  color: string;
  iconType: "armchair" | "message-circle";
}

export const FloqsScreen = () => {
  // Get stored radius preference or default to 1km
  const getStoredRadius = () => {
    try {
      const stored = localStorage.getItem('floq-radius-km');
      return stored ? parseFloat(stored) : 1;
    } catch {
      return 1;
    }
  };

  const [radiusKm, setRadiusKm] = useState(getStoredRadius);
  const coords = useGeolocation();
  const { nearby: nearbyFloqs, loading: floqsLoading } = useNearbyFloqs(coords.lat, coords.lng, { km: radiusKm });

  // Persist radius preference
  useEffect(() => {
    try {
      localStorage.setItem('floq-radius-km', radiusKm.toString());
    } catch {
      // Ignore localStorage errors
    }
  }, [radiusKm]);

  // Mock data for now - will be replaced with real floqs
  const [mockFloqs] = useState<FloqCard[]>([
    {
      id: "1",
      title: "Nico's Rooftop Chill",
      type: "Chill",
      description: "Good vibes",
      startTime: "Starts in 32 min",
      location: "Rooftop",
      participants: 3,
      vibeMatch: 92,
      status: "open",
      color: "hsl(180 70% 60%)",
      iconType: "armchair"
    },
    {
      id: "2", 
      title: "Midnight Mingling",
      type: "Social",
      description: "Looks like your vibe. Join?",
      startTime: "Pulse Match: 82%",
      location: "Social Space",
      participants: 8,
      vibeMatch: 82,
      status: "open",
      color: "hsl(280 70% 60%)",
      iconType: "message-circle"
    }
  ]);

  const getIcon = (iconType: "armchair" | "message-circle") => {
    return iconType === "armchair" ? <Armchair size={24} /> : <MessageCircle size={24} />;
  };

  return (
    <div className="min-h-screen p-6 pt-16">
      {/* Debug counter */}
      {process.env.NODE_ENV === 'development' && (
        <div className="absolute top-2 right-2 z-30 text-xs opacity-60 bg-black/20 px-2 py-1 rounded">
          {nearbyFloqs.length} floqs ≤ {radiusKm} km
        </div>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <button className="p-2 rounded-xl bg-card/50 backdrop-blur-sm border border-border/30 hover:bg-card/80 transition-all duration-300">
          <Search size={20} className="text-muted-foreground" />
        </button>
        <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          floqs
        </h1>
        <button className="p-2 rounded-xl bg-card/50 backdrop-blur-sm border border-border/30 hover:bg-card/80 transition-all duration-300">
          <Plus size={20} className="text-muted-foreground" />
        </button>
      </div>

      {/* Radius Slider */}
      <div className="mb-6">
        <div className="bg-card/90 backdrop-blur-xl rounded-3xl border border-border/30">
          <RadiusSlider km={radiusKm} onChange={setRadiusKm} />
        </div>
      </div>

      {/* Floqs Status */}
      {nearbyFloqs.length === 0 && !floqsLoading && coords.lat && coords.lng && (
        <div className="mb-6 text-center py-8">
          <p className="text-muted-foreground">No floqs within {radiusKm} km</p>
          <p className="text-sm text-muted-foreground/60 mt-1">Try increasing the radius</p>
        </div>
      )}

      {/* Featured Floq */}
      <div className="mb-8">
        <div className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 border border-border/30 transition-all duration-300 hover:scale-[1.02]">
          <div className="flex items-start space-x-4 mb-6">
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center animate-pulse-glow"
              style={{
                backgroundColor: mockFloqs[0].color,
                boxShadow: `0 0 30px ${mockFloqs[0].color}`
              }}
            >
              <div className="text-background">
                {getIcon(mockFloqs[0].iconType)}
              </div>
            </div>
            <div className="flex-1">
              <h2 className="text-2xl font-bold mb-2">{mockFloqs[0].title}</h2>
              <div className="flex items-center space-x-2 text-muted-foreground mb-3">
                <span className="text-sm font-medium">{mockFloqs[0].type}</span>
                <span>•</span>
                <span className="text-sm">{mockFloqs[0].startTime}</span>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-gradient-secondary border-2 border-background"></div>
                  ))}
                </div>
                <span className="text-sm text-primary font-medium capitalize">{mockFloqs[0].status}</span>
                <span className="text-sm text-accent font-medium">Sunset</span>
              </div>
            </div>
          </div>
          
          <div className="grid grid-cols-2 gap-3">
            <button className="bg-gradient-primary text-primary-foreground py-3 px-6 rounded-2xl font-semibold transition-all duration-300 hover:scale-105 hover:shadow-lg">
              Join
            </button>
            <button className="bg-secondary/60 text-secondary-foreground py-3 px-6 rounded-2xl font-semibold transition-all duration-300 hover:scale-105 hover:bg-secondary/80">
              Chat
            </button>
            <button className="bg-accent/20 text-accent py-3 px-6 rounded-2xl font-semibold transition-all duration-300 hover:scale-105 hover:bg-accent/30">
              Boost Vibe
            </button>
            <button className="bg-muted/20 text-muted-foreground py-3 px-6 rounded-2xl font-medium transition-all duration-300 hover:scale-105 hover:bg-muted/30">
              Suggest Change
            </button>
          </div>
        </div>
      </div>

      {/* Suggested Floqs */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-6 text-accent">Suggested Floqs</h2>
        
        <div className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 border border-border/30 transition-all duration-300 hover:scale-[1.02]">
          <div className="flex items-center space-x-4 mb-6">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center animate-pulse-glow"
              style={{
                backgroundColor: mockFloqs[1].color,
                boxShadow: `0 0 20px ${mockFloqs[1].color}`
              }}
            >
              <div className="text-background">
                {getIcon(mockFloqs[1].iconType)}
              </div>
            </div>
            <div className="flex-1">
              <h3 className="text-xl font-bold mb-1">{mockFloqs[1].title}</h3>
              <div className="text-muted-foreground mb-2">
                <span className="text-sm font-medium">{mockFloqs[1].type}</span>
                <span> • </span>
                <span className="text-sm">{mockFloqs[1].startTime}</span>
              </div>
              <p className="text-sm text-foreground">{mockFloqs[1].description}</p>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button className="flex-1 bg-gradient-primary text-primary-foreground py-3 rounded-2xl font-semibold transition-all duration-300 hover:scale-105">
              Join
            </button>
            <button className="flex-1 bg-secondary/60 text-secondary-foreground py-3 rounded-2xl font-semibold transition-all duration-300 hover:scale-105 hover:bg-secondary/80">
              Chat
            </button>
            <button className="px-6 bg-accent/20 text-accent py-3 rounded-2xl font-semibold transition-all duration-300 hover:scale-105 hover:bg-accent/30">
              Boost
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Detail */}
      <div className="bg-card/60 backdrop-blur-xl rounded-3xl p-6 border border-border/30">
        <h3 className="text-xl font-bold mb-2">{mockFloqs[1].title}</h3>
        <div className="text-muted-foreground mb-4">
          <span className="font-medium">{mockFloqs[1].type}</span>
          <span> • </span>
          <span>{mockFloqs[1].startTime}</span>
        </div>
        <p className="text-foreground">{mockFloqs[1].description}</p>
      </div>

      {/* Bottom Navigation Spacer */}
      <div className="h-24"></div>
    </div>
  );
};