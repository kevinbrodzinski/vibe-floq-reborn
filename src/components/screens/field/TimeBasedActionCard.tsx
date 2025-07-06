import { Button } from "@/components/ui/button";
import { Coffee, Zap, Users, Navigation, Plus, Heart, Star, Sparkles, Sliders } from "lucide-react";

interface TimeBasedActionCardProps {
  timeState: string;
  onTimeWarpToggle: () => void;
}

export const TimeBasedActionCard = ({ timeState, onTimeWarpToggle }: TimeBasedActionCardProps) => {
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
                onClick={onTimeWarpToggle}
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
                onClick={onTimeWarpToggle}
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

  return getTimeBasedActionCard();
};