
import { useState } from 'react';
import { X, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { UsernameStep } from '@/components/UsernameStep';
import { useUsername } from '@/hooks/useUsername';

export const UsernameBanner = () => {
  const { hasUsername } = useUsername();
  const [isOpen, setIsOpen] = useState(false);
  const [isDismissed, setIsDismissed] = useState(false);

  // Don't show banner if user already has username or has dismissed it
  if (hasUsername || isDismissed) {
    return null;
  }

  return (
    <>
      <div className="bg-primary/10 border-b border-border px-4 py-3">
        <div className="flex items-center justify-between max-w-4xl mx-auto">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-primary" />
            <div>
              <p className="font-medium text-sm">Choose your username</p>
              <p className="text-xs text-muted-foreground">
                Make it easier for friends to find you
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              onClick={() => setIsOpen(true)}
            >
              Set Username
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsDismissed(true)}
              className="h-8 w-8 p-0"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Choose your username</DialogTitle>
          </DialogHeader>
          <UsernameStep 
            onComplete={() => setIsOpen(false)}
            isModal={true}
          />
        </DialogContent>
      </Dialog>
    </>
  );
};
