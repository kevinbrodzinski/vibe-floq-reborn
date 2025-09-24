import { useState } from "react";
import { MapPin, Clock, Users, Star, Heart, Plus } from "lucide-react";

interface Venue {
  id: string;
  name: string;
  type: string;
  description: string;
  location: string;
  rating: number;
  priceLevel: number;
  vibeMatch: number;
  crowdLevel: 'low' | 'medium' | 'high';
  peakTimes: string[];
  tags: string[];
  color: string;
  image: string;
  friendsHere: number;
  estimatedTime: string;
}

interface VenueCardLibraryProps {
  onVenueSelect: (venue: Venue) => void;
  selectedVenues?: string[];
  searchQuery?: string;
}

export const VenueCardLibrary = ({ onVenueSelect, selectedVenues = [], searchQuery = "" }: VenueCardLibraryProps) => {
  const [venues] = useState<Venue[]>([
    {
      id: "venue-1",
      name: "Bestia",
      type: "Restaurant",
      description: "Italian bone marrow and craft cocktails",
      location: "Arts District",
      rating: 4.6,
      priceLevel: 3,
      vibeMatch: 88,
      crowdLevel: "high",
      peakTimes: ["19:00", "20:00", "21:00"],
      tags: ["Italian", "Date Night", "Trendy"],
      color: "hsl(200 70% 60%)",
      image: "/placeholder.svg",
      friendsHere: 2,
      estimatedTime: "2 hours"
    },
    {
      id: "venue-2", 
      name: "EP & LP",
      type: "Rooftop Bar",
      description: "Southeast Asian rooftop with city views",
      location: "West Hollywood",
      rating: 4.4,
      priceLevel: 3,
      vibeMatch: 92,
      crowdLevel: "medium",
      peakTimes: ["21:00", "22:00", "23:00"],
      tags: ["Rooftop", "Cocktails", "Views"],
      color: "hsl(280 70% 60%)",
      image: "/placeholder.svg",
      friendsHere: 5,
      estimatedTime: "2-3 hours"
    },
    {
      id: "venue-3",
      name: "The Edison",
      type: "Cocktail Lounge",
      description: "Vintage industrial cocktail experience",
      location: "Downtown",
      rating: 4.2,
      priceLevel: 3,
      vibeMatch: 75,
      crowdLevel: "medium",
      peakTimes: ["22:00", "23:00", "00:00"],
      tags: ["Vintage", "Unique", "Dancing"],
      color: "hsl(30 70% 60%)",
      image: "/placeholder.svg",
      friendsHere: 1,
      estimatedTime: "3+ hours"
    },
    {
      id: "venue-4",
      name: "Republique",
      type: "French Bistro",
      description: "All-day French bistro in beautiful space",
      location: "Mid-City",
      rating: 4.5,
      priceLevel: 3,
      vibeMatch: 82,
      crowdLevel: "low",
      peakTimes: ["19:30", "20:30"],
      tags: ["French", "Brunch", "Elegant"],
      color: "hsl(320 70% 60%)",
      image: "/placeholder.svg",
      friendsHere: 0,
      estimatedTime: "1.5 hours"
    },
    {
      id: "venue-5",
      name: "Catch LA",
      type: "Seafood & Rooftop",
      description: "Seafood and sushi with rooftop party vibes",
      location: "West Hollywood",
      rating: 4.1,
      priceLevel: 4,
      vibeMatch: 85,
      crowdLevel: "high",
      peakTimes: ["20:00", "21:00", "22:00"],
      tags: ["Seafood", "Party", "See & Be Seen"],
      color: "hsl(180 70% 60%)",
      image: "/placeholder.svg",
      friendsHere: 3,
      estimatedTime: "2-3 hours"
    }
  ]);

  const [draggedVenue, setDraggedVenue] = useState<Venue | null>(null);

  const filteredVenues = venues.filter(venue => 
    venue.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    venue.type.toLowerCase().includes(searchQuery.toLowerCase()) ||
    venue.tags.some(tag => tag.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const getCrowdColor = (level: string) => {
    switch (level) {
      case 'low': return 'hsl(120 70% 60%)';
      case 'medium': return 'hsl(60 70% 60%)';
      case 'high': return 'hsl(0 70% 60%)';
      default: return 'hsl(0 0% 50%)';
    }
  };

  const handleDragStart = (e: React.DragEvent, venue: Venue) => {
    setDraggedVenue(venue);
    e.dataTransfer.setData('application/json', JSON.stringify(venue));
    e.dataTransfer.effectAllowed = 'copy';
  };

  const handleDragEnd = () => {
    setDraggedVenue(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-foreground">Venue Suggestions</h3>
        <div className="text-sm text-muted-foreground">
          Drag to add to plan
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 max-h-96 overflow-y-auto scrollbar-hide">
        {filteredVenues.map((venue, index) => (
          <div
            key={venue.id}
            draggable
            onDragStart={(e) => handleDragStart(e, venue)}
            onDragEnd={handleDragEnd}
            onClick={() => onVenueSelect(venue)}
            className={`bg-card/90 backdrop-blur-xl rounded-2xl p-4 border border-border/30 cursor-grab transition-all duration-300 hover:scale-[1.02] hover:glow-secondary animate-fade-in ${
              selectedVenues.includes(venue.id) ? 'ring-2 ring-primary glow-primary' : ''
            } ${draggedVenue?.id === venue.id ? 'opacity-50 scale-95' : ''}`}
            style={{ 
              animationDelay: `${index * 100}ms`,
              boxShadow: draggedVenue?.id === venue.id ? '0 10px 30px rgba(0,0,0,0.3)' : undefined
            }}
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <div className="flex items-center space-x-2 mb-1">
                  <h4 className="font-semibold text-foreground">{venue.name}</h4>
                  <div className="flex items-center space-x-1">
                    <Star className="w-3 h-3 fill-yellow-400 text-yellow-400" />
                    <span className="text-xs text-muted-foreground">{venue.rating}</span>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground mb-2">{venue.type} • {venue.description}</p>
                
                <div className="flex items-center space-x-3 text-xs text-accent">
                  <div className="flex items-center space-x-1">
                    <MapPin className="w-3 h-3" />
                    <span>{venue.location}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{venue.estimatedTime}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Users className="w-3 h-3" />
                    <span style={{ color: getCrowdColor(venue.crowdLevel) }}>
                      {venue.crowdLevel}
                    </span>
                  </div>
                </div>
              </div>
              
              <div className="flex flex-col items-end space-y-2">
                <div className="text-right">
                  <div className="text-sm font-medium text-primary">
                    {venue.vibeMatch}% match
                  </div>
                  {venue.friendsHere > 0 && (
                    <div className="text-xs text-accent flex items-center space-x-1">
                      <Heart className="w-3 h-3" />
                      <span>{venue.friendsHere} friends</span>
                    </div>
                  )}
                </div>
                
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    onVenueSelect(venue);
                  }}
                  className="p-2 rounded-full bg-primary/20 hover:bg-primary/30 transition-colors"
                >
                  <Plus className="w-4 h-4 text-primary" />
                </button>
              </div>
            </div>
            
            {/* Tags */}
            <div className="flex flex-wrap gap-1">
              {venue.tags.slice(0, 3).map((tag) => (
                <span 
                  key={tag}
                  className="text-xs px-2 py-1 rounded-full bg-secondary/40 text-secondary-foreground"
                >
                  {tag}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};