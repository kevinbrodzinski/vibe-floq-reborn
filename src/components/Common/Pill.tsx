import React from "react";

export default function Pill({ 
  children, 
  active,
  glow = true,
  glowColor = "gold",
  className = ""
}: { 
  children: React.ReactNode;
  active?: boolean;
  glow?: boolean;
  glowColor?: "cyan" | "gold" | "purple";
  className?: string;
}) {
  const glowClass = glow ? (
    glowColor === "cyan" ? "ring-neon" :
    glowColor === "purple" ? "ring-neon-purple" : 
    "ring-neon-gold"  // default gold
  ) : "";

  return (
    <span className={`${
      glow 
        ? `px-2.5 py-1 rounded-full text-[11px] text-white/80 border bg-white/10 border-white/10 ${glowClass}` 
        : `px-2.5 py-1 rounded-full text-[11px] text-white/80 border ${
            active 
              ? "bg-white/15 border-white/20" 
              : "bg-white/10 border-white/10"
          }`
    } ${className}`}>
      {children}
    </span>
  );
}