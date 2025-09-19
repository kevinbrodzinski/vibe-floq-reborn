import React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
  glow?: boolean;
  active?: boolean;         // allows pressed state for ghost buttons
  size?: "xs" | "md";
  neon?: "cyan" | "raspberry" | "gold";  // new neon color
  className?: string;
};

export default function Btn({
  variant = "ghost",
  glow = false,
  active = false,
  size = "md",
  neon = "cyan",
  className = "",
  ...rest
}: Props) {
  const base = "btn-compact";
  const sizeCls = size === "xs" ? "btn-xs" : "";
  
  // If it's a primary *and* glowing, use the glass primary skin (no white background)
  const skin = variant === "primary" && glow
    ? "btn-primary-glass"
    : (variant === "primary" ? "btn-compact--primary" : "btn-compact--ghost");
    
  const activeCls = active && variant !== "primary" ? "bg-white/10 border-white/20" : "";
  const neonCls = glow
    ? `ring-neon ${neon === "raspberry" ? "ring-neon-raspberry" : neon === "gold" ? "ring-neon-gold" : "ring-neon-cyan"}`
    : "";
  
  return <button className={`neon-surface ${base} ${sizeCls} ${skin} ${activeCls} ${neonCls} ${className}`} {...rest} />;
}