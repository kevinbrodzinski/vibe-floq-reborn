
import { useState, useEffect } from 'react';
import { Check, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useUsername } from '@/hooks/useUsername';

interface UsernameStepProps {
  onComplete?: () => void;
  isModal?: boolean;
}

export const UsernameStep = ({ onComplete, isModal = false }: UsernameStepProps) => {
  const {
    draft,
    updateDraft,
    isAvailable,
    isCheckingAvailability,
    claimUsername,
    isClaimingUsername,
  } = useUsername();

  const [localValue, setLocalValue] = useState('');

  // Sync local input with draft
  useEffect(() => {
    updateDraft(localValue);
  }, [localValue, updateDraft]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isAvailable && draft.trim()) {
      claimUsername(draft.trim());
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && isAvailable && draft.trim()) {
      handleSubmit(e);
    }
  };

  const isValidFormat = /^[a-z0-9_]{3,32}$/.test(localValue);
  const showValidation = localValue.length >= 3;
  const canSubmit = isAvailable && draft.trim() && !isClaimingUsername;

  const ValidationIcon = () => {
    if (isCheckingAvailability) return <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />;
    if (!showValidation) return null;
    if (!isValidFormat) return <X className="w-4 h-4 text-destructive" />;
    if (isAvailable === true) return <Check className="w-4 h-4 text-green-600" />;
    if (isAvailable === false) return <X className="w-4 h-4 text-destructive" />;
    return null;
  };

  const getHelperText = () => {
    if (!showValidation) return "3-32 characters: letters, numbers, underscore";
    if (!isValidFormat) return "Invalid format. Use letters, numbers, underscore only";
    if (isCheckingAvailability) return "Checking availability...";
    if (isAvailable === true) return "Username is available!";
    if (isAvailable === false) return "Username is taken";
    return "";
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
            <Label htmlFor="username">Username</Label>
            <div className="relative">
              <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground">
                @
              </div>
              <Input
                id="username"
                type="text"
                placeholder="your_username"
                value={localValue}
                onChange={(e) => setLocalValue(e.target.value.toLowerCase())}
                onKeyDown={handleKeyDown}
                className="pl-8 pr-10"
                autoFocus
                disabled={isClaimingUsername}
              />
              <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
                <ValidationIcon />
              </div>
            </div>
            <p className="text-sm text-muted-foreground">
              {getHelperText()}
            </p>
          </div>

          <Button 
            type="submit"
            disabled={!canSubmit}
            className="w-full"
          >
            {isClaimingUsername ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Claiming...
              </>
            ) : (
              'Claim Username'
            )}
          </Button>

          {onComplete && (
            <Button 
              type="button" 
              variant="ghost" 
              onClick={onComplete}
              className="w-full"
              disabled={isClaimingUsername}
            >
              Skip for now
            </Button>
          )}
        </form>
      </ContentWrapper>
    </div>
  );
};
