import { SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { VisuallyHidden } from "@radix-ui/react-visually-hidden";

export function HiddenTitle({ children }: { children: React.ReactNode }) {
  return (
    <VisuallyHidden asChild>
      <SheetTitle>{children}</SheetTitle>
    </VisuallyHidden>
  );
}

export function HiddenDescription({ children }: { children: React.ReactNode }) {
  return (
    <VisuallyHidden asChild>
      <SheetDescription>{children}</SheetDescription>
    </VisuallyHidden>
  );
}