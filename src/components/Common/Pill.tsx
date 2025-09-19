import React from "react";

export default function Pill({ children, glow=true }: { children: React.ReactNode; glow?: boolean }) {
  return (
    <span
      className={`px-2.5 py-1 rounded-full text-[11px] text-white/85 border border-white/12 bg-white/6 ${
        glow ? "ring-neon" : ""
      }`}
    >
      {children}
    </span>
  );
}