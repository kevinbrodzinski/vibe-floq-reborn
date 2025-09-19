import React from "react";

export default function Pill({
  children,
  glow = true,
  className = "",
}: {
  children: React.ReactNode;
  glow?: boolean;
  className?: string;
}) {
  return (
    <span className={`px-2 py-0.5 text-[10px] rounded-md border ${glow ? "ring-neon" : ""} bg-white/5 border-white/10 ${className}`}>
      {children}
    </span>
  );
}