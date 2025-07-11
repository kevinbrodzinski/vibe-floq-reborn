import { AvatarDropdown } from "@/components/AvatarDropdown";
import { cn } from "@/lib/utils";

interface AvatarButtonProps {
  className?: string;
}

export const AvatarButton = ({ className }: AvatarButtonProps) => {
  return (
    <div 
      className={cn(
        "backdrop-blur-xl rounded-full",
        "transition-all duration-200",
        className
      )}
    >
      <AvatarDropdown />
    </div>
  );
};