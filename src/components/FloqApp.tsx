import { useState } from "react";
import { FieldScreen } from "./screens/FieldScreen";
import { FloqsScreen } from "./screens/FloqsScreen";
import { PulseScreen } from "./screens/PulseScreen";
import { VibeScreen } from "./screens/VibeScreen";
import { AfterglowScreen } from "./screens/AfterglowScreen";
import { FloqNavigation } from "./FloqNavigation";
import { TimeSyncProvider } from "./TimeSyncProvider";
import { AIContextSurface } from "./AIContextSurface";
import { SocialPulse } from "./SocialPulse";

export type FloqTab = "field" | "floqs" | "pulse" | "vibe" | "afterglow";

export const FloqApp = () => {
  const [activeTab, setActiveTab] = useState<FloqTab>("field");

  const renderScreen = () => {
    switch (activeTab) {
      case "field":
        return <FieldScreen />;
      case "floqs":
        return <FloqsScreen />;
      case "pulse":
        return <PulseScreen />;
      case "vibe":
        return <VibeScreen />;
      case "afterglow":
        return <AfterglowScreen />;
      default:
        return <FieldScreen />;
    }
  };

  return (
    <TimeSyncProvider>
      <div className="min-h-screen bg-gradient-field text-foreground overflow-hidden">
        <div className="pb-20">
          {renderScreen()}
        </div>
        <FloqNavigation activeTab={activeTab} onTabChange={setActiveTab} />
        <SocialPulse />
        <AIContextSurface />
      </div>
    </TimeSyncProvider>
  );
};