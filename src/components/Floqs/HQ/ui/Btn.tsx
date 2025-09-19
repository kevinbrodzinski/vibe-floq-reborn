import React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
  glow?: boolean;
  active?: boolean;         // allows pressed state for ghost buttons
  size?: "xs" | "md";
  className?: string;
};

export default function Btn({
  variant = "ghost",
  glow = false,
  active = false,
  size = "md",
  className = "",
  ...rest
}: Props) {
  const base = "btn-compact";
  const sizeCls = size === "xs" ? "btn-xs" : "";
  const skin = variant === "primary" ? "btn-compact--primary" : "btn-compact--ghost";
  const neon = glow && variant === "primary" ? "neon-soft" : "";
  const activeCls = active && variant !== "primary" ? "bg-white/10 border-white/20" : "";
  return <button className={`${base} ${sizeCls} ${skin} ${neon} ${activeCls} ${className}`} {...rest} />;
}