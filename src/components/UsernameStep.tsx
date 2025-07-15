
import { useState, useEffect } from 'react';
import { Check, X, Loader2, User } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUsername } from '@/hooks/useUsername';
import { useUsernameAvailability } from '@/hooks/useUsernameAvailability';

interface UsernameStepProps {
  onComplete?: () => void;
  isModal?: boolean;
}

export const UsernameStep = ({ onComplete, isModal = false }: UsernameStepProps) => {
  const { updateUsername, isUpdatingUsername } = useUsername();
  const [localValue, setLocalValue] = useState('');
  
  const {
    isChecking: isCheckingAvailability,
    isAvailable,
    validationMessage,
    validationState
  } = useUsernameAvailability(localValue);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAvailable && localValue.trim() && validationState === 'available') {
      updateUsername(localValue.toLowerCase().trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isAvailable && localValue.trim() && validationState === 'available') {
      handleSubmit(e);
    }
  };

  const previewUsername = localValue.toLowerCase();
  const canSubmit = validationState === 'available' && !isUpdatingUsername;
  const characterCount = localValue.length;
  const maxCharacters = 32;

  const ValidationIcon = () => {
    if (validationState === 'checking') return <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />;
    if (validationState === 'available') return <Check className="w-4 h-4 text-green-600" />;
    if (validationState === 'taken' || validationState === 'invalid') return <X className="w-4 h-4 text-destructive" />;
    return <User className="w-4 h-4 text-muted-foreground" />;
  };

  const containerClassName = isModal 
    ? "space-y-4 p-2" 
    : "max-w-md mx-auto p-4";

  const ContentWrapper = isModal 
    ? ({ children }: { children: React.ReactNode }) => <div>{children}</div>
    : ({ children }: { children: React.ReactNode }) => (
        <Card>
          <CardHeader className="text-center">
            <CardTitle>Choose your username</CardTitle>
            <CardDescription>
              Pick a unique username that your friends can find you by
            </CardDescription>
          </CardHeader>
          <CardContent>{children}</CardContent>
        </Card>
      );

  return (
    <div className={containerClassName}>
      <ContentWrapper>
        <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <Label htmlFor="username">Username</Label>
                <span className={`text-xs ${characterCount > maxCharacters ? 'text-destructive' : 'text-muted-foreground'}`}>
                  {characterCount}/{maxCharacters}
                </span>
              </div>
              <div className="relative">
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                  @
                </div>
                <Input
                  id="username"
                  type="text"
                  placeholder="your_username"
                  value={localValue}
                  onChange={(e) => setLocalValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-8 pr-10"
                  autoFocus
                  disabled={isUpdatingUsername}
                  maxLength={maxCharacters}
                />
                <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                  <ValidationIcon />
                </div>
              </div>
              
              {/* Validation message */}
              <p className={`text-sm ${
                validationState === 'available' ? 'text-green-600' : 
                validationState === 'taken' || validationState === 'invalid' ? 'text-destructive' : 
                'text-muted-foreground'
              }`}>
                {validationMessage}
              </p>
              
              {/* Preview lowercase username */}
              {localValue && localValue !== previewUsername && (
                <p className="text-xs text-muted-foreground">
                  Will be stored as: <span className="font-mono">@{previewUsername}</span>
                </p>
              )}
            </div>

          <Button 
            type="submit"
            disabled={!canSubmit}
            className="w-full"
          >
            {isUpdatingUsername ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Updating...
              </>
            ) : (
              'Update Username'
            )}
          </Button>

          {onComplete && (
            <Button 
              type="button" 
              variant="ghost" 
              onClick={onComplete}
              className="w-full"
              disabled={isUpdatingUsername}
            >
              Skip for now
            </Button>
          )}
        </form>
      </ContentWrapper>
    </div>
  );
};
