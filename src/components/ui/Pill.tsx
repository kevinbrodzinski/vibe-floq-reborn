import React from "react";

export default function Pill({
  children,
  active = false,
  className = "",
}: {
  children: React.ReactNode;
  active?: boolean;
  className?: string;
}) {
  return (
    <span className={`chip-compact ${className}`} data-active={active ? "true" : "false"}>
      {children}
    </span>
  );
}
