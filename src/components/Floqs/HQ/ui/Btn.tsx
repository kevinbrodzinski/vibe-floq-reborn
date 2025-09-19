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
  const base = "btn-compact btn-neon";
  const sizeCls = size === "xs" ? "btn-xs" : "";
  const skin = variant === "primary" ? "btn-compact--primary" : "btn-compact--ghost";
  const activeCls = active && variant !== "primary" ? "bg-white/10 border-white/20" : "";
  const neonCls = glow
    ? `ring-neon ${neon === "raspberry" ? "ring-neon-raspberry" : neon === "gold" ? "ring-neon-gold" : "ring-neon-cyan"}`
    : "";
  
  return <button className={`${base} ${sizeCls} ${skin} ${activeCls} ${neonCls} ${className}`} {...rest} />;
}