import { useState } from "react";

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
  icon: string;
}

export const FloqsScreen = () => {
  const [floqs] = useState<FloqCard[]>([
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
      icon: "🪑"
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
      icon: "💬"
    }
  ]);

  return (
    <div className="min-h-screen p-6 pt-16">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <button className="text-2xl">🔍</button>
        <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
          floqs
        </h1>
        <button className="text-2xl">+</button>
      </div>

      {/* Featured Floq */}
      <div className="mb-8">
        <div className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 border border-border/30 transition-all duration-300 hover:scale-[1.02]">
          <div className="flex items-start space-x-4 mb-4">
            <div 
              className="w-20 h-20 rounded-full flex items-center justify-center text-2xl animate-pulse-glow"
              style={{
                backgroundColor: floqs[0].color,
                boxShadow: `0 0 30px ${floqs[0].color}`
              }}
            >
              {floqs[0].icon}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-bold mb-1">{floqs[0].title}</h2>
              <div className="flex items-center space-x-2 text-muted-foreground">
                <span>{floqs[0].type}</span>
                <span>•</span>
                <span>{floqs[0].startTime}</span>
              </div>
              <div className="flex items-center mt-2 space-x-4">
                <div className="flex -space-x-2">
                  {[1, 2, 3].map((i) => (
                    <div key={i} className="w-8 h-8 rounded-full bg-gradient-secondary border-2 border-background"></div>
                  ))}
                </div>
                <span className="text-sm text-primary font-medium">{floqs[0].status}</span>
                <span className="text-sm text-accent">Sunset</span>
              </div>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button className="flex-1 bg-gradient-primary text-primary-foreground py-3 rounded-2xl font-medium transition-all duration-300 hover:scale-105">
              Join
            </button>
            <button className="flex-1 bg-secondary/50 text-secondary-foreground py-3 rounded-2xl font-medium transition-all duration-300 hover:scale-105">
              Chat
            </button>
            <button className="px-6 bg-accent/20 text-accent py-3 rounded-2xl font-medium transition-all duration-300 hover:scale-105">
              Boost Vibe
            </button>
            <button className="px-6 bg-muted/30 text-muted-foreground py-3 rounded-2xl font-medium transition-all duration-300 hover:scale-105">
              Suggest Change
            </button>
          </div>
        </div>
      </div>

      {/* Suggested Floqs */}
      <div className="mb-8">
        <h2 className="text-2xl font-bold mb-4 text-accent">Suggested Floqs</h2>
        
        <div className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 border border-border/30 transition-all duration-300 hover:scale-[1.02]">
          <div className="flex items-center space-x-4 mb-4">
            <div 
              className="w-16 h-16 rounded-full flex items-center justify-center text-xl animate-pulse-glow"
              style={{
                backgroundColor: floqs[1].color,
                boxShadow: `0 0 20px ${floqs[1].color}`
              }}
            >
              {floqs[1].icon}
            </div>
            <div className="flex-1">
              <h3 className="text-lg font-bold">{floqs[1].title}</h3>
              <div className="text-muted-foreground">
                <span>{floqs[1].type}</span>
                <span> • </span>
                <span>{floqs[1].startTime}</span>
              </div>
              <p className="text-sm text-foreground mt-1">{floqs[1].description}</p>
            </div>
          </div>
          
          <div className="flex space-x-3">
            <button className="flex-1 bg-gradient-primary text-primary-foreground py-3 rounded-2xl font-medium transition-all duration-300 hover:scale-105">
              Join
            </button>
            <button className="flex-1 bg-secondary/50 text-secondary-foreground py-3 rounded-2xl font-medium transition-all duration-300 hover:scale-105">
              Chat
            </button>
            <button className="px-6 bg-accent/20 text-accent py-3 rounded-2xl font-medium transition-all duration-300 hover:scale-105">
              Boost
            </button>
          </div>
        </div>
      </div>

      {/* Expanded Detail */}
      <div className="bg-card/60 backdrop-blur-xl rounded-3xl p-6 border border-border/30">
        <h3 className="text-xl font-bold mb-2">{floqs[1].title}</h3>
        <div className="text-muted-foreground mb-4">
          <span>{floqs[1].type}</span>
          <span> • </span>
          <span>{floqs[1].startTime}</span>
        </div>
        <p className="text-foreground">{floqs[1].description}</p>
      </div>

      {/* Bottom Navigation Spacer */}
      <div className="h-24"></div>
    </div>
  );
};