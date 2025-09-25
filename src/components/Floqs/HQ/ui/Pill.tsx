import React from "react";

export default function Pill({
  children,
  glow = true,
  glowColor = "gold",
  className = "",
}: {
  children: React.ReactNode;
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
    <span className={`px-2 py-0.5 text-[10px] rounded-md border ${glowClass} bg-white/5 border-white/10 ${className}`}>
      {children}
    </span>
  );
}