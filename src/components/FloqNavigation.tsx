import { FloqTab } from "./FloqApp";
import { LayoutGrid, Circle, MessageCircle, Star } from "lucide-react";

interface FloqNavigationProps {
  activeTab: FloqTab;
  onTabChange: (tab: FloqTab) => void;
}

export const FloqNavigation = ({ activeTab, onTabChange }: FloqNavigationProps) => {
  const tabs = [
    { id: "field" as FloqTab, label: "Field", Icon: LayoutGrid },
    { id: "floqs" as FloqTab, label: "Floqs", Icon: Circle },
    { id: "pulse" as FloqTab, label: "Pulse", Icon: Circle },
    { id: "vibe" as FloqTab, label: "Vibe", Icon: MessageCircle },
    { id: "afterglow" as FloqTab, label: "Afterglow", Icon: Star },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-xl border-t border-border/30">
      <div className="flex justify-around items-center py-2 px-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex flex-col items-center py-2 px-4 rounded-2xl transition-all duration-300 ${
              activeTab === tab.id
                ? "bg-gradient-primary text-primary-foreground shadow-lg scale-110 animate-pulse-glow"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/50"
            }`}
          >
            <tab.Icon size={20} className="mb-1" />
            <span className="text-xs font-medium">{tab.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};