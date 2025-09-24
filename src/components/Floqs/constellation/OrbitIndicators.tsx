import * as React from "react";

export function OrbitIndicators({ 
  activeTab, 
  momentaryCount = 0, 
  tribesCount = 0, 
  publicCount = 0 
}: { 
  activeTab: "momentary" | "tribes" | "public";
  momentaryCount?: number;
  tribesCount?: number; 
  publicCount?: number;
}) {
  const getIntensity = (count: number) => {
    if (count === 0) return "opacity-20";
    if (count < 3) return "opacity-40";
    if (count < 8) return "opacity-70";
    return "opacity-100";
  };

  const getActiveGlow = (tab: string) => 
    activeTab === tab ? "shadow-[0_0_12px_hsl(var(--primary)/0.8)] scale-125" : "";

  return (
    <div className="flex items-center justify-center gap-8 mt-4 mb-2">
      {/* Momentary Orbital */}
      <div className="relative flex items-center gap-1">
        <div className={`
          w-3 h-3 rounded-full bg-primary transition-all duration-500
          ${getIntensity(momentaryCount)} ${getActiveGlow("momentary")}
        `} />
        <div className={`
          w-1.5 h-1.5 rounded-full bg-primary/60 transition-all duration-500
          ${getIntensity(momentaryCount)}
        `} />
        <div className={`
          w-1 h-1 rounded-full bg-primary/40 transition-all duration-500
          ${getIntensity(momentaryCount)}
        `} />
      </div>

      {/* Tribes Orbital */}
      <div className="relative flex items-center gap-1">
        <div className={`
          w-1.5 h-1.5 rounded-full bg-accent/60 transition-all duration-500
          ${getIntensity(tribesCount)}
        `} />
        <div className={`
          w-3 h-3 rounded-full bg-accent transition-all duration-500
          ${getIntensity(tribesCount)} ${getActiveGlow("tribes")}
        `} />
        <div className={`
          w-1.5 h-1.5 rounded-full bg-accent/60 transition-all duration-500
          ${getIntensity(tribesCount)}
        `} />
      </div>

      {/* Public Orbital */}
      <div className="relative flex items-center gap-1">
        <div className={`
          w-1 h-1 rounded-full bg-secondary/40 transition-all duration-500
          ${getIntensity(publicCount)}
        `} />
        <div className={`
          w-1.5 h-1.5 rounded-full bg-secondary/60 transition-all duration-500
          ${getIntensity(publicCount)}
        `} />
        <div className={`
          w-3 h-3 rounded-full bg-secondary transition-all duration-500
          ${getIntensity(publicCount)} ${getActiveGlow("public")}
        `} />
      </div>
    </div>
  );
}