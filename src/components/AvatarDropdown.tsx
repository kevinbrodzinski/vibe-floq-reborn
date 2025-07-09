import { useDebug } from '@/lib/useDebug';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export const AvatarDropdown = () => {
  const [debug, setDebug] = useDebug();

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <div className="w-12 h-12 rounded-full gradient-secondary border-2 border-primary/30 glow-secondary overflow-hidden cursor-pointer hover:scale-105 transition-smooth pointer-events-auto">
          <div className="w-full h-full bg-muted-foreground/10"></div>
        </div>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="pointer-events-auto">
        <DropdownMenuItem onSelect={() => setDebug(v => !v)}>
          {debug ? 'Hide testing overlays' : 'Show testing overlays'}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};