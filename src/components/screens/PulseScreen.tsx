import { useState } from "react";
import { Mic, Search, MapPin, Clock, Target, Sparkles } from "lucide-react";

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
  mutuals?: number;
}

export const PulseScreen = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFilters, setSelectedFilters] = useState<string[]>(["Venue"]);
  
  const vibeFilters = ["Chill", "Hype", "Romantic", "Weird", "Solo"];
  const radiusFilters = ["Walking", "Driving", "All LA"];
  const timeFilters = ["Now", "Later", "Afterparty"];
  const energyFilters = ["High Motion", "Social Flow", "Lurking"];
  
  const allFilters = ["Venue", "Chill", "Walking", "Now", "Social Flow"];
  
  const [recommendations] = useState<PulseRecommendation[]>([
    {
      id: "1",
      type: "venue",
      title: "Chill drinks at Echo Rooftop",
      subtitle: "Good vibes • 22 people • Open group",
      description: "Echo Park • Starts at 9:30 • Vibe Match: 88%",
      location: "Echo Park",
      time: "Starts at 9:30",
      vibeMatch: 88,
      participants: 22,
      status: "Open group",
      color: "hsl(200 70% 60%)",
      mutuals: 2
    },
    {
      id: "2", 
      type: "floq",
      title: "Vinyl lounge session",
      subtitle: "Karaoke • 10 going • Open group",
      description: "Eastside Vibes • Starts in 1 hr",
      location: "Eastside Vibes",
      time: "Starts in 1 hr",
      participants: 10,
      status: "Open group",
      color: "hsl(280 70% 60%)"
    },
    {
      id: "3",
      type: "person",
      title: "Eli and Jackie at Highlands",
      subtitle: "Vibe: Chill • 3 going • 3 miles away",
      description: "Perfect match for your current energy",
      participants: 3,
      color: "hsl(30 70% 60%)"
    }
  ]);

  const quickSuggestions = [
    { text: "Good music + low-key crowd" },
    { text: "Open plans nearby" },
    { text: "Where's the energy flowing?" }
  ];

  return (
    <div className="min-h-screen bg-gradient-field">
      {/* Top Bar */}
      <div className="flex justify-between items-center p-6 pt-16">
        <button className="p-2 rounded-full hover:bg-secondary/20 transition-colors">
          <div className="w-6 h-6 rounded-full bg-gradient-secondary flex items-center justify-center">
            <div className="w-3 h-3 bg-white rounded-full"></div>
          </div>
        </button>
        
        <h1 className="text-3xl font-light bg-gradient-secondary bg-clip-text text-transparent animate-pulse-glow">
          pulse
        </h1>
        
        <button className="p-2 rounded-full hover:bg-secondary/20 transition-colors">
          <Mic className="w-6 h-6 text-muted-foreground" />
        </button>
      </div>

      <div className="px-6 pb-24">
        {/* Ask Pulse Input */}
        <div className="mb-6">
          <div className="relative">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="What's the move tonight?"
              className="w-full bg-card/90 backdrop-blur-xl border-2 border-border/30 rounded-3xl py-4 px-6 pr-14 text-foreground placeholder-muted-foreground focus:outline-none focus:border-primary/50 focus:glow-primary transition-all duration-300"
            />
            <button className="absolute right-4 top-1/2 transform -translate-y-1/2 p-2 rounded-full hover:bg-primary/10 transition-colors">
              <Search className="w-5 h-5 text-muted-foreground" />
            </button>
          </div>
          
          {/* Quick Suggestions */}
          <div className="mt-4 space-y-2">
            {quickSuggestions.map((suggestion, index) => (
              <button
                key={index}
                className="block w-full text-left bg-card/60 backdrop-blur-xl border border-border/20 rounded-2xl py-3 px-4 text-sm text-muted-foreground transition-all duration-300 hover:bg-card/80 hover:text-foreground hover:scale-[1.02]"
              >
                {suggestion.text}
              </button>
            ))}
          </div>
        </div>

        {/* Dynamic Filters Bar */}
        <div className="mb-8">
          <div className="flex space-x-2 overflow-x-auto pb-2 scrollbar-hide">
            {allFilters.map((filter) => (
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
                    ? "bg-gradient-primary text-primary-foreground glow-primary"
                    : "bg-secondary/30 text-secondary-foreground hover:bg-secondary/50 border border-border/30"
                }`}
              >
                {filter}
              </button>
            ))}
          </div>
        </div>

        {/* AI Feed of Recommendations */}
        <div className="space-y-6">
          {recommendations.map((rec, index) => (
            <div
              key={rec.id}
              className="bg-card/90 backdrop-blur-xl rounded-3xl p-6 border border-border/30 transition-all duration-500 hover:scale-[1.02] hover:glow-secondary animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              {/* Pulse Signature */}
              <div className="flex items-center justify-between mb-4">
                <div className="bg-secondary/40 text-secondary-foreground px-3 py-1 rounded-full text-xs font-medium capitalize">
                  {rec.type}
                </div>
                <div className="text-xs text-muted-foreground flex items-center space-x-1">
                  <Sparkles className="w-3 h-3" />
                  <span>Suggested for you just now</span>
                </div>
              </div>
              
              {/* Content */}
              <div className="mb-4">
                <h3 className="text-xl font-bold mb-2 text-foreground">{rec.title}</h3>
                <p className="text-muted-foreground mb-3">{rec.subtitle}</p>
                
                {/* Details Line */}
                <div className="flex flex-wrap items-center gap-4 text-sm text-accent">
                  {rec.location && (
                    <div className="flex items-center space-x-1">
                      <MapPin className="w-4 h-4" />
                      <span>{rec.location}</span>
                    </div>
                  )}
                  {rec.time && (
                    <div className="flex items-center space-x-1">
                      <Clock className="w-4 h-4" />
                      <span>{rec.time}</span>
                    </div>
                  )}
                  {rec.vibeMatch && (
                    <div className="flex items-center space-x-1">
                      <Target className="w-4 h-4" />
                      <span>Vibe Match: {rec.vibeMatch}%</span>
                    </div>
                  )}
                  {rec.mutuals && (
                    <div className="flex items-center space-x-1">
                      <div className="w-4 h-4 rounded-full bg-gradient-secondary"></div>
                      <span>{rec.mutuals} mutuals nearby</span>
                    </div>
                  )}
                </div>
              </div>

              {/* CTA Buttons */}
              <div className="flex space-x-3">
                {rec.type === "venue" && (
                  <>
                    <button className="flex-1 bg-gradient-primary text-primary-foreground py-3 rounded-2xl font-medium transition-all duration-300 hover:scale-105 text-center">
                      View Crowd
                    </button>
                    <button className="px-6 bg-secondary/50 text-secondary-foreground py-3 rounded-2xl font-medium transition-all duration-300 hover:scale-105 border border-border/30">
                      Add to Plan
                    </button>
                  </>
                )}
                {rec.type === "floq" && (
                  <button className="flex-1 bg-gradient-primary text-primary-foreground py-3 rounded-2xl font-medium transition-all duration-300 hover:scale-105 text-center">
                    Join Now
                  </button>
                )}
                {rec.type === "person" && (
                  <button className="flex-1 bg-gradient-secondary text-secondary-foreground py-3 rounded-2xl font-medium transition-all duration-300 hover:scale-105 text-center">
                    DM Someone There
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};