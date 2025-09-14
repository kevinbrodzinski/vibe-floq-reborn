import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';

interface NameClusterPromptProps {
  suggestion?: string;
  onAccept?: (name: string) => void;
  onDismiss?: () => void;
}

export function NameClusterPrompt({ 
  suggestion, 
  onAccept, 
  onDismiss 
}: NameClusterPromptProps) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (suggestion) {
      setOpen(true);
    }
  }, [suggestion]);

  const handleAccept = () => {
    if (suggestion && onAccept) {
      onAccept(suggestion);
    }
    setOpen(false);
  };

  const handleDismiss = () => {
    if (onDismiss) {
      onDismiss();
    }
    setOpen(false);
  };

  if (!open || !suggestion) return null;

  return (
    <Card className="fixed bottom-4 left-4 p-4 bg-card/90 backdrop-blur-sm shadow-lg border max-w-sm">
      <div className="space-y-3">
        <div>
          <h4 className="font-medium text-card-foreground">Name this frequent spot?</h4>
          <p className="text-sm text-muted-foreground mt-1">
            Suggested: {suggestion}
          </p>
        </div>
        
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            size="sm"
            onClick={handleDismiss}
            className="flex-1"
          >
            Not now
          </Button>
          <Button 
            size="sm"
            onClick={handleAccept}
            className="flex-1"
          >
            Use name
          </Button>
        </div>
      </div>
    </Card>
  );
}