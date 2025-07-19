import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { User, AtSign, FileText, Heart, CheckCircle, Loader2 } from 'lucide-react';
import { useUsernameValidation } from '@/hooks/useUsernameValidation';

interface ProfileData {
  username: string;
  display_name: string;
  bio?: string;
  interests?: string[];
}

interface ProfileSetupStepProps {
  onNext: (data: ProfileData) => void;
  onBack?: () => void;
}

export function ProfileSetupStep({ onNext, onBack }: ProfileSetupStepProps) {
  const [formData, setFormData] = useState<ProfileData>({
    username: '',
    display_name: '',
    bio: '',
    interests: [],
  });
  const [interestsInput, setInterestsInput] = useState('');
  const [displayNameError, setDisplayNameError] = useState('');
  
  const usernameValidation = useUsernameValidation(formData.username);

  const validateForm = () => {
    if (!formData.display_name || formData.display_name.length < 2) {
      setDisplayNameError('Display name must be at least 2 characters');
      return false;
    }
    
    if (!usernameValidation.isValid || !usernameValidation.isAvailable) {
      return false;
    }
    
    setDisplayNameError('');
    return true;
  };

  const handleInputChange = (field: keyof ProfileData, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear display name error when user starts typing
    if (field === 'display_name' && displayNameError) {
      setDisplayNameError('');
    }
  };

  const handleUsernameSelect = (username: string) => {
    setFormData(prev => ({ ...prev, username }));
  };

  const handleInterestsChange = (value: string) => {
    setInterestsInput(value);
    const interests = value.split(',').map(i => i.trim()).filter(Boolean);
    setFormData(prev => ({
      ...prev,
      interests
    }));
  };

  const handleSubmit = () => {
    if (validateForm()) {
      onNext(formData);
    }
  };

  const isValid = usernameValidation.isValid && 
                  usernameValidation.isAvailable && 
                  formData.display_name.length >= 2;

  return (
    <div className="space-y-6">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-2">Create Your Profile</h2>
        <p className="text-muted-foreground">
          Tell us a bit about yourself to personalize your Floq experience
        </p>
      </div>

      <Card className="max-w-md mx-auto">
        <CardContent className="p-6 space-y-4">
          <div className="space-y-2">
            <Label htmlFor="username" className="flex items-center gap-2">
              <AtSign className="w-4 h-4" />
              Username
            </Label>
            <Input
              id="username"
              value={formData.username}
              onChange={(e) => handleInputChange('username', e.target.value)}
              placeholder="Enter your username"
              className={!usernameValidation.isValid && formData.username.length > 0 ? 'border-destructive' : 
                         usernameValidation.isAvailable ? 'border-green-500' : ''}
            />
            
            {/* Username validation feedback */}
            {formData.username.length > 0 && (
              <div className="space-y-2">
                {usernameValidation.isChecking ? (
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Checking availability...
                  </div>
                ) : usernameValidation.isAvailable ? (
                  <div className="flex items-center gap-2 text-sm text-green-600">
                    <CheckCircle className="w-4 h-4" />
                    {usernameValidation.message}
                  </div>
                ) : (
                  <div className="space-y-2">
                    <p className="text-sm text-destructive">{usernameValidation.message}</p>
                    {usernameValidation.suggestions.length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {usernameValidation.suggestions.map((suggestion) => (
                          <Button
                            key={suggestion}
                            variant="outline"
                            size="sm"
                            onClick={() => handleUsernameSelect(suggestion)}
                            className="text-xs h-7"
                          >
                            {suggestion}
                          </Button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="display_name" className="flex items-center gap-2">
              <User className="w-4 h-4" />
              Display Name
            </Label>
            <Input
              id="display_name"
              value={formData.display_name}
              onChange={(e) => handleInputChange('display_name', e.target.value)}
              placeholder="How should others see you?"
              className={displayNameError ? 'border-destructive' : ''}
            />
            {displayNameError && (
              <p className="text-sm text-destructive">{displayNameError}</p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="bio" className="flex items-center gap-2">
              <FileText className="w-4 h-4" />
              Bio <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Textarea
              id="bio"
              value={formData.bio}
              onChange={(e) => handleInputChange('bio', e.target.value)}
              placeholder="Tell us about yourself..."
              rows={3}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="interests" className="flex items-center gap-2">
              <Heart className="w-4 h-4" />
              Interests <span className="text-muted-foreground text-xs">(optional)</span>
            </Label>
            <Input
              id="interests"
              value={interestsInput}
              onChange={(e) => handleInterestsChange(e.target.value)}
              placeholder="music, art, hiking, coffee..."
            />
            <p className="text-xs text-muted-foreground">
              Separate interests with commas
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3 max-w-md mx-auto">
        {onBack && (
          <Button variant="outline" onClick={onBack} className="flex-1">
            Back
          </Button>
        )}
        <Button 
          onClick={handleSubmit}
          disabled={!isValid}
          className="flex-1"
        >
          Create Profile
        </Button>
      </div>
    </div>
  );
}