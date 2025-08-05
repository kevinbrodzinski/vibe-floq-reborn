import { useVibe } from '@/lib/store/useVibe';
import { Eye, EyeOff, Users } from 'lucide-react';
import { shallow } from 'zustand/shallow';

const cycle: Record<'public' | 'friends' | 'off', 'public' | 'friends' | 'off'> = {
  public: 'friends',
  friends: 'off',
  off: 'public',
};

export function VisibilityButton() {
  const { visibility, setVisibility } = useVibe();

  const Icon = visibility === 'public'
    ? Eye
    : visibility === 'friends'
    ? Users
    : EyeOff;

  return (
    <button
      className={`p-2 rounded-xl bg-card/40 backdrop-blur-sm border border-border/30 transition-all duration-300 hover:bg-card/60 ${
        visibility === 'off' ? 'opacity-40 grayscale' : 'text-foreground'
      }`}
      onClick={() => setVisibility(cycle[visibility as keyof typeof cycle])}
      title={
        visibility === 'public'
          ? 'Visible to everyone'
          : visibility === 'friends'
          ? 'Visible to friends'
          : 'Hidden from all'
      }
    >
      <Icon className="w-5 h-5" />
    </button>
  );
}