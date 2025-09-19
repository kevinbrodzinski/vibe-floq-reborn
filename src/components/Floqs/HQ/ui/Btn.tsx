import React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
  glow?: boolean;
  active?: boolean;         // allows pressed state for ghost buttons
  className?: string;
};

export default function Btn({
  variant = "ghost",
  glow = false,
  active = false,
  className = "",
  ...rest
}: Props) {
  const base = "btn-compact";
  const skin = variant === "primary" ? "btn-compact--primary" : "btn-compact--ghost";
  const neon = glow && variant === "primary" ? "neon-soft" : "";
  const activeCls = active && variant !== "primary" ? "bg-white/10 border-white/20" : "";
  return <button className={`${base} ${skin} ${neon} ${activeCls} ${className}`} {...rest} />;
}