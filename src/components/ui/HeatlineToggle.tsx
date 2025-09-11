import { Chip } from '@/components/ui/Chip';
import { haptics } from '@/utils/haptics';

export function HeatlineToggle({ on, onToggle }: { on: boolean; onToggle: (next:boolean)=>void }) {
  const handle = () => {
    const next = !on;
    onToggle(next);
    
    // Haptic feedback
    haptics.toggle();
    
    // Broadcast event for other components
    window.dispatchEvent(new CustomEvent('floq:heatline:toggle', { detail: { on: next } }));
  };

  return (
    <div className="fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[560]">
      <Chip
        color={on ? 'slate' : 'slate'}
        pressed={on}
        onClick={handle}
        className="cursor-pointer"
        aria-pressed={on}
      >
        {on ? 'Heatline: On' : 'Heatline: Off'}
      </Chip>
    </div>
  );
}