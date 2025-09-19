import React from "react";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "ghost";
  glow?: boolean;
  active?: boolean;
  className?: string;
};

export default function Btn({ variant="ghost", glow=false, active=false, className="", ...rest }: Props) {
  const base = "btn-compact";
  const skin = variant === "primary" ? "btn-compact--primary" : "btn-compact--ghost";
  const neon = glow && variant === "primary" ? "neon-soft" : "";
  const activeClass = active ? "bg-white/15 border-white/25" : "";
  return <button className={`${base} ${skin} ${neon} ${activeClass} ${className}`} {...rest} />;
}