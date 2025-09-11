import { Chip } from '@/components/ui/Chip';
import { haptics } from '@/utils/haptics';
import { EVT_HEAT_TOGGLE } from '@/lib/events';

export function HeatlineToggle({ on, onToggle }: { on: boolean; onToggle: (next:boolean)=>void }) {
  const handle = () => {
    const next = !on;
    onToggle(next);
    try { haptics?.toggle?.(); } catch {}
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new CustomEvent(EVT_HEAT_TOGGLE, { detail: { on: next } }));
    }
  };

  return (
    <div className="fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[560]">
      <Chip
        color={on ? 'indigo' : 'slate'}
        pressed={on}
        onClick={handle}
        aria-pressed={on}
      >
        {on ? 'Heatline: On' : 'Heatline: Off'}
      </Chip>
    </div>
  );
}