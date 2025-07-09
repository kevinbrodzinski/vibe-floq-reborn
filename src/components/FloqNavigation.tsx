import { useActiveTab, type FloqTab } from "@/store/useActiveTab";
import { LayoutGrid, Circle, MessageCircle, Star, Calendar } from "lucide-react";

export const FloqNavigation = () => {
  const { tab: activeTab, setTab } = useActiveTab();
  const tabs = [
    { id: "field" as FloqTab, label: "Field", Icon: LayoutGrid },
    { id: "floqs" as FloqTab, label: "Floqs", Icon: Circle },
    { id: "pulse" as FloqTab, label: "Pulse", Icon: Circle },
    { id: "plan" as FloqTab, label: "Plan", Icon: Calendar },
    { id: "vibe" as FloqTab, label: "Vibe", Icon: MessageCircle },
    { id: "afterglow" as FloqTab, label: "Afterglow", Icon: Star },
  ];

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-card/80 backdrop-blur-xl border-t border-border/30">
      <div className="flex justify-around items-center py-2 px-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => setTab(tab.id)}
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