import React from 'react';
import { Brain, Target, Lightbulb, TrendingUp, MapPin, Clock } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';

interface IntelligenceOnboardingProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function IntelligenceOnboarding({ open, onOpenChange }: IntelligenceOnboardingProps) {
  const [currentStep, setCurrentStep] = React.useState(0);

  const steps = [
    {
      icon: Brain,
      title: "Welcome to FLOQ Intelligence",
      description: "Your personal AI learns from your choices to provide better recommendations",
      content: (
        <div className="space-y-4">
          <div className="bg-gradient-to-r from-primary/10 to-secondary/10 rounded-lg p-4">
            <h4 className="font-medium mb-2">How it works:</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li>• AI analyzes your vibe patterns and corrections</li>
              <li>• Learns your preferences for activities and locations</li>
              <li>• Provides personalized recommendations that improve over time</li>
            </ul>
          </div>
        </div>
      )
    },
    {
      icon: Target,
      title: "Pattern Learning",
      description: "The system learns from your feedback to understand your preferences",
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <TrendingUp className="w-6 h-6 mx-auto mb-2 text-green-600" />
              <div className="text-sm font-medium">Vibe Corrections</div>
              <div className="text-xs text-muted-foreground">When you adjust vibes</div>
            </div>
            <div className="bg-muted/50 rounded-lg p-3 text-center">
              <MapPin className="w-6 h-6 mx-auto mb-2 text-blue-600" />
              <div className="text-sm font-medium">Location Patterns</div>
              <div className="text-xs text-muted-foreground">Your favorite places</div>
            </div>
          </div>
          <div className="text-center">
            <Badge variant="secondary" className="mb-2">Building your profile...</Badge>
            <Progress value={25} className="h-2" />
          </div>
        </div>
      )
    },
    {
      icon: Lightbulb,
      title: "Smart Recommendations",
      description: "Get contextual suggestions based on location, time, and your patterns",
      content: (
        <div className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <Clock className="w-5 h-5 text-orange-600" />
              <div>
                <div className="text-sm font-medium">Time-aware suggestions</div>
                <div className="text-xs text-muted-foreground">
                  "You usually feel energetic around 3pm - perfect time for a workout"
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3 p-3 bg-muted/30 rounded-lg">
              <MapPin className="w-5 h-5 text-green-600" />
              <div>
                <div className="text-sm font-medium">Location-based activities</div>
                <div className="text-xs text-muted-foreground">
                  "Nearby coffee shop matches your chill vibe preferences"
                </div>
              </div>
            </div>
          </div>
        </div>
      )
    }
  ];

  const currentStepData = steps[currentStep];
  const Icon = currentStepData.icon;

  const handleNext = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onOpenChange(false);
      setCurrentStep(0);
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-2">
            <div className="p-2 bg-primary/10 rounded-lg">
              <Icon className="w-5 h-5 text-primary" />
            </div>
            <div className="flex gap-1">
              {steps.map((_, index) => (
                <div
                  key={index}
                  className={`w-2 h-2 rounded-full ${
                    index === currentStep ? 'bg-primary' : 'bg-muted'
                  }`}
                />
              ))}
            </div>
          </div>
          <DialogTitle>{currentStepData.title}</DialogTitle>
          <DialogDescription>
            {currentStepData.description}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {currentStepData.content}
        </div>

        <div className="flex gap-2 pt-4">
          {currentStep > 0 && (
            <Button variant="outline" onClick={handlePrevious} size="sm">
              Previous
            </Button>
          )}
          <Button onClick={handleNext} className="flex-1" size="sm">
            {currentStep === steps.length - 1 ? 'Get Started' : 'Next'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}