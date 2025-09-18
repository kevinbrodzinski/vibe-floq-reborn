import React from "react";

export default function SmartMap({
  placeholder = "(Map preview)"
}: {
  placeholder?: string;
}) {
  return (
    <div className="relative h-72 rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-800 grid place-items-center text-xs text-white/60">
      {placeholder}
    </div>
  );
}