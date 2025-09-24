import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { useOnboardingStatus } from '@/hooks/useOnboardingStatus';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, MapPin, Users, Sparkles } from 'lucide-react';

interface OnboardingScreenProps {
  onComplete: () => void;
}

const ONBOARDING_STEPS = [
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

export function OnboardingScreen({ onComplete }: OnboardingScreenProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [isCompleting, setIsCompleting] = useState(false);
  const { markCompleted } = useOnboardingStatus();
  const { toast } = useToast();

  const handleNext = () => {
    if (currentStep < ONBOARDING_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleComplete = async () => {
    try {
      setIsCompleting(true);
      await markCompleted();
      toast({
        title: "Welcome to Floq!",
        description: "You're all set to start discovering your vibe.",
      });
      onComplete();
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

  const handleSkip = () => {
    handleComplete();
  };

  const currentStepData = ONBOARDING_STEPS[currentStep];
  const Icon = currentStepData.icon;
  const isLastStep = currentStep === ONBOARDING_STEPS.length - 1;

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
            <Icon className="w-8 h-8 text-primary" />
          </div>
          <CardTitle className="text-2xl font-bold">
            {currentStepData.title}
          </CardTitle>
          <CardDescription className="text-base">
            {currentStepData.description}
          </CardDescription>
        </CardHeader>

        <CardContent>
          {/* Progress indicators */}
          <div className="flex justify-center space-x-2 mb-6">
            {ONBOARDING_STEPS.map((_, index) => (
              <div
                key={index}
                className={`w-2 h-2 rounded-full transition-colors ${
                  index <= currentStep ? 'bg-primary' : 'bg-muted'
                }`}
              />
            ))}
          </div>

          {/* Step indicators */}
          <div className="space-y-3">
            {ONBOARDING_STEPS.map((step, index) => {
              const StepIcon = step.icon;
              const isCompleted = index < currentStep;
              const isCurrent = index === currentStep;
              
              return (
                <div
                  key={index}
                  className={`flex items-center space-x-3 p-2 rounded-lg transition-colors ${
                    isCurrent ? 'bg-primary/5 border border-primary/20' : 
                    isCompleted ? 'bg-muted/50' : 'opacity-50'
                  }`}
                >
                  <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                    isCompleted ? 'bg-primary text-primary-foreground' :
                    isCurrent ? 'bg-primary/10 text-primary' : 'bg-muted'
                  }`}>
                    {isCompleted ? (
                      <CheckCircle className="w-4 h-4" />
                    ) : (
                      <StepIcon className="w-4 h-4" />
                    )}
                  </div>
                  <span className={`text-sm font-medium ${
                    isCurrent ? 'text-foreground' : 'text-muted-foreground'
                  }`}>
                    {step.title}
                  </span>
                </div>
              );
            })}
          </div>
        </CardContent>

        <CardFooter className="flex flex-col space-y-2">
          <Button 
            onClick={handleNext} 
            className="w-full"
            disabled={isCompleting}
          >
            {isCompleting ? "Setting up..." : isLastStep ? "Get Started" : "Next"}
          </Button>
          
          <Button 
            variant="ghost" 
            onClick={handleSkip}
            className="w-full text-muted-foreground"
            disabled={isCompleting}
          >
            Skip for now
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}