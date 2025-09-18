import React from "react";
import Btn from "./Btn";

export default function SmartComposer({
  placeholder = "Type message…"
}: {
  placeholder?: string;
}) {
  return (
    <div className="rounded-2xl bg-white/5 border border-white/10 p-3 flex items-center gap-2">
      <input
        aria-label="Message"
        className="flex-1 bg-transparent outline-none text-[13px] placeholder-white/40"
        placeholder={placeholder}
      />
      <Btn>@</Btn>
      <Btn ariaLabel="Attach photo">📷</Btn>
      <Btn ariaLabel="Attach location">📍</Btn>
      <button
        type="button"
        className="px-3 py-1.5 rounded-xl bg-gradient-to-br from-zinc-900 to-zinc-800 border border-white/10 text-[12px]"
      >
        Send
      </button>
    </div>
  );
}