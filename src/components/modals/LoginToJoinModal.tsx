
import { useState } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

interface LoginToJoinModalProps {
  open: boolean;
  onClose: () => void;
  planTitle?: string;
}

export function LoginToJoinModal({ open, onClose, planTitle }: LoginToJoinModalProps) {
  const handleLoginRedirect = () => {
    // Save current path for redirect after login
    const currentPath = window.location.pathname;
    localStorage.setItem('floq_redirect_path', currentPath);
    
    // Redirect to home page which will show auth screen
    window.location.href = '/';
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">Join this plan</DialogTitle>
          <button
            onClick={onClose}
            className="absolute right-4 top-4 rounded-sm opacity-70 ring-offset-background transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          >
            <X className="h-4 w-4" />
          </button>
        </DialogHeader>
        
        <div className="flex flex-col items-center gap-4 py-4">
          <div className="text-center space-y-2">
            <p className="text-sm text-muted-foreground">
              {planTitle ? `Log in to join "${planTitle}"` : 'Log in to join this plan'}
            </p>
            <p className="text-xs text-muted-foreground">
              You'll be able to RSVP, check in, and see who else is coming.
            </p>
          </div>
          
          <div className="flex gap-3 w-full">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button onClick={handleLoginRedirect} className="flex-1">
              Log In
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
