import { Chip } from '@/components/ui/Chip';

interface HeatlineToggleProps {
  on: boolean;
  onToggle: (on: boolean) => void;
}

export function HeatlineToggle({ on, onToggle }: HeatlineToggleProps) {
  const handleClick = () => {
    const newState = !on;
    onToggle(newState);
    window.dispatchEvent(new CustomEvent('floq:heatline:toggle', { 
      detail: { on: newState } 
    }));
  };

  return (
    <div className="fixed right-4 bottom-[calc(5.5rem+env(safe-area-inset-bottom))] z-[560]">
      <Chip pressed={on} onClick={handleClick}>
        {on ? 'Heatline: On' : 'Heatline: Off'}
      </Chip>
    </div>
  );
}