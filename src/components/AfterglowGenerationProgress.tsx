import { Progress } from "@/components/ui/progress"
import { Sparkles, Brain, Users, MapPin, Calendar } from "lucide-react"

interface GenerationProgress {
  step: string
  progress: number
  status: 'in_progress' | 'completed' | 'error'
  message?: string
}

interface AfterglowGenerationProgressProps {
  progress: GenerationProgress | null
}

const getStepIcon = (step: string) => {
  switch (step.toLowerCase()) {
    case 'collecting data':
    case 'data collection':
      return <MapPin className="w-4 h-4" />
    case 'processing':
    case 'analyzing':
      return <Brain className="w-4 h-4" />
    case 'social connections':
    case 'connections':
      return <Users className="w-4 h-4" />
    case 'generating moments':
    case 'moments':
      return <Calendar className="w-4 h-4" />
    default:
      return <Sparkles className="w-4 h-4" />
  }
}

export function AfterglowGenerationProgress({ progress }: AfterglowGenerationProgressProps) {
  if (!progress) {
    return null; // Don't render anything if progress is null
  }
  
  const { step, progress: progressValue, status, message } = progress
  
  const getStatusColor = () => {
    switch (status) {
      case 'completed': return 'bg-green-500'
      case 'error': return 'bg-red-500'
      default: return 'bg-primary'
    }
  }

  return (
    <div className="bg-card/80 backdrop-blur-xl rounded-3xl p-6 border border-border/30 glow-secondary">
      <div className="flex items-center space-x-3 mb-4">
        <div className="p-2 rounded-full bg-primary/10 border border-primary/20">
          {getStepIcon(step)}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Generating Your Ripple
          </h3>
          <p className="text-sm text-muted-foreground">
            {step}
          </p>
        </div>
      </div>

      <div className="space-y-3">
        <Progress 
          value={typeof progressValue === 'number' ? progressValue : 0} 
          className="h-2"
        />
        
        <div className="flex justify-between items-center text-sm">
          <span className="text-muted-foreground">
            {message || `${step}...`}
          </span>
          <span className="text-primary font-medium">
            {Math.round(typeof progressValue === 'number' ? progressValue : 0)}%
          </span>
        </div>
      </div>

      {status === 'error' && (
        <div className="mt-4 p-3 rounded-lg bg-destructive/10 border border-destructive/20">
          <p className="text-sm text-destructive">
            Something went wrong during generation. Please try again.
          </p>
        </div>
      )}
    </div>
  )
}