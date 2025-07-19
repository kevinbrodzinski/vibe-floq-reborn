import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Camera, SkipForward, User } from 'lucide-react';
import { AvatarUpload } from '@/components/AvatarUpload';

interface AvatarSelectionStepProps {
  onNext: (avatarUrl?: string | null) => void;
  onBack?: () => void;
  currentAvatarUrl?: string | null;
  displayName?: string | null;
}

export function AvatarSelectionStep({ 
  onNext, 
  onBack, 
  currentAvatarUrl, 
  displayName 
}: AvatarSelectionStepProps) {
  const [avatarUrl, setAvatarUrl] = useState<string | null>(currentAvatarUrl || null);

  const handleAvatarChange = (newAvatarUrl: string | null) => {
    setAvatarUrl(newAvatarUrl);
  };

  const handleContinue = () => {
    onNext(avatarUrl);
  };

  const handleSkip = () => {
    onNext(null);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Add Your Photo</h2>
        <p className="text-muted-foreground">
          Help others recognize you when you connect in person (optional)
        </p>
      </div>

      <div className="flex flex-col items-center space-y-6">
        <div className="relative">
          <AvatarUpload
            currentAvatarUrl={avatarUrl}
            displayName={displayName}
            onAvatarChange={handleAvatarChange}
            size={120}
          />
        </div>

        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
            <Camera className="w-4 h-4" />
            <span>Upload from camera or gallery</span>
          </div>
          <p className="text-xs text-muted-foreground">
            Your photo is only visible to your connections
          </p>
        </div>
      </div>

      <div className="flex gap-3">
        {onBack && (
          <Button variant="outline" onClick={onBack} className="flex-1">
            Back
          </Button>
        )}
        <Button variant="outline" onClick={handleSkip} className="flex-1">
          <SkipForward className="w-4 h-4 mr-2" />
          Skip for now
        </Button>
        <Button onClick={handleContinue} className="flex-1">
          Continue
        </Button>
      </div>
    </div>
  );
}