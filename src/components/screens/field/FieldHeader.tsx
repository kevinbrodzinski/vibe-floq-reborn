import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";

export const FieldHeader = () => {
  return (
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
  );
};