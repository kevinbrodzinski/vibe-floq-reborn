import { useState } from "react";

interface PulseRecommendation {
  id: string;
  type: "venue" | "floq" | "person";
  title: string;
  subtitle: string;
  description: string;
  location?: string;
  time?: string;
  vibeMatch?: number;
  participants?: number;
  status?: string;
  color: string;
  icon: string;
}

export const PulseScreen = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<string[]>(["Venue"]);
  
  const filters = ["Venue", "Chill", "Walking", "Now", "Social Flow"];
  
  const [recommendations] = useState<PulseRecommendation[]>([
    {
      id: "1",
      type: "venue",
      title: "Chill drinks at Echo Rooftop",
      subtitle: "Good vibes • 22 people • Open group",
      description: "Echo Park • Starts at 9:30 • Vibe Match: 88%",
      location: "Echo Park",
      time: "9:30",
      vibeMatch: 88,
      participants: 22,
      status: "Open group",
      color: "hsl(240 70% 60%)",
      icon: "🍻"
    },
    {
      id: "2", 
      type: "floq",
      title: "Vinyl lounge session",
      subtitle: "Karaoke • 10 going • Open group",
      description: "Eastside Vibes • Starts in 1 hr",
      location: "Eastside Vibes",
      time: "1 hr",
      participants: 10,
      status: "Open group",
      color: "hsl(280 70% 60%)",
      icon: "🎵"
    },
    {
      id: "3",
      type: "person",
      title: "Eli and Jackie at Highlands",
      subtitle: "Vibe: Chill • 3 going • 3 miles away",
      description: "Perfect match for your current energy",
      participants: 3,
      color: "hsl(30 70% 60%)",
      icon: "👥"
    }
  ]);

  const quickSuggestions = [
    { icon: "🎧", text: "Good music + low-key crowd" },
    { icon: "🏢", text: "Open plans" }
  ];

  return (
    <div className="min-h-screen p-6 pt-16">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <button className="text-2xl text-muted-foreground">AI</button>
        <h1 className="text-4xl font-bold bg-gradient-secondary bg-clip-text text-transparent">
          pulse
        </h1>
        <button className="text-2xl">🎤</button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="What's the move tonight?"
            className="w-full bg-card/90 backdrop-blur-xl border border-border/30 rounded-3xl py-4 px-6 text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all duration-300"
          />
          <button className="absolute right-6 top-1/2 transform -translate-y-1/2 text-muted-foreground">
            🔍
          </button>
        </div>
      </div>

      {/* Quick Suggestions */}
      <div className="flex space-x-3 mb-6">
        {quickSuggestions.map((suggestion, index) => (
          <button
            key={index}
            className="flex items-center space-x-2 bg-card/90 backdrop-blur-xl border border-border/30 rounded-2xl py-3 px-4 text-sm transition-all duration-300 hover:scale-105 hover:bg-primary/10"
          >
            <span>{suggestion.icon}</span>
            <span>{suggestion.text}</span>
          </button>
        ))}
      </div>

      {/* Filter Pills */}
      <div className="flex space-x-2 mb-8 overflow-x-auto pb-2">
        {filters.map((filter) => (
          <button
            key={filter}
            onClick={() => {
              if (selectedFilters.includes(filter)) {
                setSelectedFilters(selectedFilters.filter(f => f !== filter));
              } else {
                setSelectedFilters([...selectedFilters, filter]);
              }
            }}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all duration-300 ${
              selectedFilters.includes(filter)
                ? "bg-gradient-primary text-primary-foreground"
                : "bg-secondary/50 text-secondary-foreground hover:bg-secondary/70"
            }`}
          >
            {filter}
          </button>
        ))}
      </div>

      {/* Recommendations */}
      <div className="space-y-4">
        {recommendations.map((rec) => (
          <div
            key={rec.id}
            className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 border border-border/30 transition-all duration-300 hover:scale-[1.02]"
          >
            <div className="flex items-start space-x-4 mb-4">
              <div className="flex-shrink-0">
                <div className="bg-secondary/50 text-secondary-foreground px-3 py-1 rounded-full text-xs font-medium mb-2">
                  {rec.type === "venue" ? "Venue" : rec.type === "floq" ? "Floq" : "Person"}
                </div>
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center text-xl animate-pulse-glow"
                  style={{
                    backgroundColor: rec.color,
                    boxShadow: `0 0 20px ${rec.color}`
                  }}
                >
                  {rec.icon}
                </div>
              </div>
              
              <div className="flex-1">
                <h3 className="text-lg font-bold mb-1">{rec.title}</h3>
                <p className="text-muted-foreground text-sm mb-2">{rec.subtitle}</p>
                <div className="flex items-center text-sm text-accent space-x-2">
                  {rec.location && (
                    <>
                      <span>📍</span>
                      <span>{rec.location}</span>
                    </>
                  )}
                  {rec.time && (
                    <>
                      <span>•</span>
                      <span>⏰</span>
                      <span>Starts at {rec.time}</span>
                    </>
                  )}
                  {rec.vibeMatch && (
                    <>
                      <span>•</span>
                      <span>🎯</span>
                      <span>Vibe Match: {rec.vibeMatch}%</span>
                    </>
                  )}
                </div>
              </div>
            </div>

            <div className="flex space-x-3">
              {rec.type === "venue" && (
                <>
                  <button className="flex-1 bg-gradient-primary text-primary-foreground py-3 rounded-2xl font-medium transition-all duration-300 hover:scale-105 flex items-center justify-center space-x-2">
                    <span>💎</span>
                    <span>View Crowd</span>
                  </button>
                  <button className="px-6 bg-secondary/50 text-secondary-foreground py-3 rounded-2xl font-medium transition-all duration-300 hover:scale-105">
                    Add to Plan
                  </button>
                </>
              )}
              {rec.type === "floq" && (
                <button className="flex-1 bg-gradient-primary text-primary-foreground py-3 rounded-2xl font-medium transition-all duration-300 hover:scale-105 flex items-center justify-center space-x-2">
                  <span>⭐</span>
                  <span>Join Now</span>
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* Bottom Navigation Spacer */}
      <div className="h-24"></div>
    </div>
  );
};