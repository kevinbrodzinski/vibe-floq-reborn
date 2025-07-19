import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RotateCcw, ArrowRight } from 'lucide-react';

interface ProgressResumePromptProps {
  onResume: () => void;
  onRestart: () => void;
  progressPercentage: number;
  lastStep: string;
}

export function ProgressResumePrompt({ 
  onResume, 
  onRestart, 
  progressPercentage,
  lastStep 
}: ProgressResumePromptProps) {
  return (
    <Card className="max-w-md mx-auto">
      <CardContent className="p-6 text-center space-y-4">
        <div className="space-y-2">
          <h3 className="text-lg font-semibold">Welcome back!</h3>
          <p className="text-sm text-muted-foreground">
            You were {progressPercentage}% through setting up your profile
          </p>
        </div>

        <div className="w-full bg-muted rounded-full h-2">
          <div 
            className="bg-primary h-2 rounded-full transition-all duration-300"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>

        <p className="text-xs text-muted-foreground">
          Last step: {lastStep}
        </p>

        <div className="flex gap-3 pt-2">
          <Button 
            variant="outline" 
            onClick={onRestart} 
            className="flex-1"
          >
            <RotateCcw className="w-4 h-4 mr-2" />
            Start Over
          </Button>
          <Button 
            onClick={onResume} 
            className="flex-1"
          >
            <ArrowRight className="w-4 h-4 mr-2" />
            Continue
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}