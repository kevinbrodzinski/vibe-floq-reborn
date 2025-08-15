import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Menu, X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface MobileActionMenuProps {
  children: React.ReactNode;
  className?: string;
}

export function MobileActionMenu({ children, className }: MobileActionMenuProps) {
  const [open, setOpen] = useState(false);

  return (
    <div className={cn("md:hidden", className)}>
      <Sheet open={open} onOpenChange={setOpen}>
        <SheetTrigger asChild>
          <Button 
            variant="ghost" 
            size="icon"
            className="p-3 min-h-[44px] min-w-[44px] rounded-xl bg-card/50 backdrop-blur-sm border border-border/30 hover:bg-card/80"
          >
            <Menu size={20} className="text-muted-foreground" />
          </Button>
        </SheetTrigger>
        <SheetContent side="right" className="w-80">
          <SheetHeader>
            <SheetTitle className="flex items-center justify-between">
              Plan Actions
              <Button 
                variant="ghost" 
                size="icon"
                onClick={() => setOpen(false)}
                className="p-2 min-h-[44px] min-w-[44px]"
              >
                <X size={20} />
              </Button>
            </SheetTitle>
          </SheetHeader>
          <div className="mt-6 space-y-4">
            {React.Children.map(children, (child, index) => (
              <div key={index} className="w-full" onClick={() => setOpen(false)}>
                {React.cloneElement(child as React.ReactElement, {
                  className: cn(
                    "w-full justify-start min-h-[44px] text-left",
                    (child as React.ReactElement).props.className
                  )
                })}
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>
    </div>
  );
}