import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, MapPin, Users, Sparkles, Heart, User } from 'lucide-react';
import { VibeSelectionStep } from './VibeSelectionStep';
import { ProfileSetupStep } from './ProfileSetupStep';
import { OnboardingProgress } from './OnboardingProgress';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { useUpdateUserPreferences } from '@/hooks/useUserPreferences';
import { useAuth } from '@/providers/AuthProvider';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { type Vibe } from '@/types/enums/vibes';
import { Button } from '@/components/ui/button';

interface EnhancedOnboardingScreenProps {
  onComplete: () => void;
}

interface ProfileData {
  username: string;
  display_name: string;
  bio?: string;
  interests?: string[];
}

const ONBOARDING_STEPS = [
  { 
    id: 'welcome', 
    title: 'Welcome', 
    icon: Sparkles,
    description: 'Welcome to Floq'
  },
  { 
    id: 'vibe', 
    title: 'Your Vibe', 
    icon: Heart,
    description: 'Choose your primary vibe'
  },
  { 
    id: 'profile', 
    title: 'Profile', 
    icon: User,
    description: 'Set up your profile'
  },
  { 
    id: 'features', 
    title: 'Features', 
    icon: MapPin,
    description: 'Discover what you can do'
  },
  { 
    id: 'complete', 
    title: 'Ready', 
    icon: CheckCircle,
    description: 'You\'re all set!'
  },
];

const FEATURE_HIGHLIGHTS = [
  {
    icon: MapPin,
    title: "Discover Your Vibe",
    description: "Find and create moments that match your energy in real-time",
  },
  {
    icon: Users,
    title: "Connect with Your People",
    description: "Join floqs and build meaningful connections with like-minded people",
  },
  {
    icon: Sparkles,
    title: "Create Lasting Memories",
    description: "Document your experiences and reflect on your journey with Afterglow",
  },
];

const ENHANCED_ONBOARDING_VERSION = 'v2';

export function EnhancedOnboardingScreen({ onComplete }: EnhancedOnboardingScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [selectedVibe, setSelectedVibe] = useState<Vibe | null>(null);
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isCompleting, setIsCompleting] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  
  const { user } = useAuth();
  const { mutateAsync: updatePreferences } = useUpdateUserPreferences();
  const { toast } = useToast();

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const handleVibeSelected = (vibe: Vibe) => {
    setSelectedVibe(vibe);
    handleNext();
  };

  const handleProfileSubmitted = async (data: ProfileData) => {
    setProfileData(data);
    handleNext();
  };

  const handleComplete = async () => {
    if (!user || !selectedVibe || !profileData) return;

    try {
      setIsCompleting(true);

      // Check username availability
      const { data: existingUser } = await supabase
        .from('profiles')
        .select('id')
        .eq('username', profileData.username)
        .neq('id', user.id)
        .maybeSingle();

      if (existingUser) {
        toast({
          title: "Username taken",
          description: "Please choose a different username.",
          variant: "destructive",
        });
        setCurrentStep(2); // Go back to profile step
        return;
      }

      // Generate default avatar if none provided
      const defaultAvatar = `https://api.dicebear.com/7.x/shapes/svg?seed=${profileData.username}`;

      // Update user preferences
      await updatePreferences({
        preferred_vibe: selectedVibe,
        vibe_color: selectedVibe,
        onboarding_version: ENHANCED_ONBOARDING_VERSION,
        onboarding_completed_at: new Date().toISOString(),
      });

      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          username: profileData.username,
          display_name: profileData.display_name,
          bio: profileData.bio || null,
          interests: profileData.interests || [],
          avatar_url: defaultAvatar,
        })
        .eq('id', user.id);

      if (profileError) {
        console.error('Profile update error:', profileError);
        throw profileError;
      }

      setShowSuccess(true);
      
      setTimeout(() => {
        toast({
          title: "Welcome to Floq!",
          description: `You're all set up with your ${selectedVibe} vibe!`,
        });
        onComplete();
      }, 1500);

    } catch (error) {
      console.error('Failed to complete onboarding:', error);
      toast({
        title: "Welcome to Floq!",
        description: "Let's get started!",
        variant: "default",
      });
      // Still proceed to app even if saving fails
      onComplete();
    } finally {
      setIsCompleting(false);
    }
  };

  if (showSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
        <div className="text-center animate-fade-in">
          <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <CheckCircle className="w-12 h-12 text-primary animate-scale-in" />
          </div>
          <h2 className="text-2xl font-bold mb-2">You're all set! ✨</h2>
          <p className="text-muted-foreground">Welcome to your personalized Floq experience</p>
        </div>
      </div>
    );
  }

  const stepTitles = ONBOARDING_STEPS.map(step => step.title);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <div className="w-full max-w-2xl">
        <div className="mb-8">
          <OnboardingProgress 
            currentStep={currentStep} 
            totalSteps={ONBOARDING_STEPS.length}
            stepTitles={stepTitles}
          />
        </div>

        <Card className="min-h-[500px]">
          <CardContent className="p-8">
            {currentStep === 0 && (
              <div className="text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <Sparkles className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h1 className="text-3xl font-bold mb-2">Welcome to Floq</h1>
                  <p className="text-muted-foreground text-lg">
                    Let's set up your personalized experience in just a few steps
                  </p>
                </div>
                <Button onClick={handleNext} size="lg" className="px-8">
                  Get Started
                </Button>
              </div>
            )}

            {currentStep === 1 && (
              <VibeSelectionStep 
                onNext={handleVibeSelected}
                onBack={handleBack}
              />
            )}

            {currentStep === 2 && (
              <ProfileSetupStep 
                onNext={handleProfileSubmitted}
                onBack={handleBack}
              />
            )}

            {currentStep === 3 && (
              <div className="space-y-6">
                <div className="text-center">
                  <h2 className="text-2xl font-bold mb-2">Discover What You Can Do</h2>
                  <p className="text-muted-foreground">
                    Floq helps you find your people and create meaningful connections
                  </p>
                </div>

                <div className="space-y-4">
                  {FEATURE_HIGHLIGHTS.map((feature, index) => {
                    const Icon = feature.icon;
                    return (
                      <div key={index} className="flex items-start space-x-4 p-4 rounded-lg bg-muted/50">
                        <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                          <Icon className="w-5 h-5 text-primary" />
                        </div>
                        <div>
                          <h3 className="font-semibold mb-1">{feature.title}</h3>
                          <p className="text-sm text-muted-foreground">{feature.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-3">
                  <Button variant="outline" onClick={handleBack} className="flex-1">
                    Back
                  </Button>
                  <Button onClick={handleNext} className="flex-1">
                    Continue
                  </Button>
                </div>
              </div>
            )}

            {currentStep === 4 && (
              <div className="text-center space-y-6">
                <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto">
                  <CheckCircle className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold mb-2">You're Ready to Explore!</h2>
                  <p className="text-muted-foreground">
                    Your profile is set up with your {selectedVibe} vibe. 
                    Start discovering floqs and connecting with your people.
                  </p>
                </div>
                <div className="flex gap-3">
                  <Button variant="outline" onClick={handleBack} className="flex-1">
                    Back
                  </Button>
                  <Button 
                    onClick={handleComplete}
                    disabled={isCompleting}
                    className="flex-1"
                    size="lg"
                  >
                    {isCompleting ? "Setting up..." : "Enter Floq"}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}