import { useState } from 'react';
import { X, Send } from 'lucide-react';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

interface DMQuickSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipientName?: string;
  recipientId?: string;
}

export const DMQuickSheet = ({ 
  open, 
  onOpenChange, 
  recipientName = "Friend",
  recipientId 
}: DMQuickSheetProps) => {
  const [message, setMessage] = useState('');

  const handleSend = () => {
    if (!message.trim()) return;
    
    // TODO: Implement actual DM sending logic
    console.log('Sending DM to:', recipientId, 'Message:', message);
    
    setMessage('');
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[400px]">
        <SheetHeader>
          <SheetTitle className="flex items-center justify-between">
            <span>Message {recipientName}</span>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </SheetTitle>
        </SheetHeader>
        
        <div className="flex flex-col h-full pt-4">
          <div className="flex-1 mb-4">
            <p className="text-sm text-muted-foreground">
              Quick message to {recipientName}
            </p>
          </div>
          
          <div className="flex gap-2">
            <Input
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type a message..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  handleSend();
                }
              }}
            />
            <Button onClick={handleSend} disabled={!message.trim()}>
              <Send className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};