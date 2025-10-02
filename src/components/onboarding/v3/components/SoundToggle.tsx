/**
 * SoundToggle - Visual indicator for sound (decorative)
 * No audio implementation yet, purely visual
 */
export function SoundToggle() {
  return (
    <div className="absolute left-4 bottom-4 opacity-60">
      <div className="h-8 w-8 rounded-full bg-white/8 border border-white/12 grid place-items-center">
        <div className="h-3 w-3 rounded-sm bg-white/50" />
      </div>
    </div>
  );
}
