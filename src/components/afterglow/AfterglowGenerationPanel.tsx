import { useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Loader2, Sparkles, AlertCircle, CheckCircle, Play, Zap } from 'lucide-react';
import { useRealtimeAfterglowData } from '@/hooks/useRealtimeAfterglowData';

/**
 * Step 4: Afterglow Generation Pipeline
 * Allows manual triggering and monitoring of afterglow generation
 */
export const AfterglowGenerationPanel = () => {
  const [isGenerating, setIsGenerating] = useState(false);
  const [lastGeneration, setLastGeneration] = useState<string | null>(null);
  const [generationError, setGenerationError] = useState<string | null>(null);
  
  const today = new Date().toISOString().split('T')[0];
  const { afterglow, isLoading, generate } = useRealtimeAfterglowData(today);

  const handleManualGeneration = async () => {
    setIsGenerating(true);
    setGenerationError(null);
    
    try {
      console.log('🚀 Step 4: Manually triggering afterglow generation...');
      await generate();
      setLastGeneration(new Date().toISOString());
    } catch (error) {
      console.error('Generation failed:', error);
      setGenerationError(error instanceof Error ? error.message : 'Unknown error');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleMarkStale = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user?.id) return;

      // Manually mark today's afterglow as stale to test the pipeline
      const { error } = await supabase
        .from('daily_afterglow')
        .update({ is_stale: true } as any)
        .eq('profile_id', user.id as any)
        .eq('date', today as any);

      if (error) throw error;
      
      console.log('✅ Marked afterglow as stale - listener should pick this up');
    } catch (error) {
      console.error('Failed to mark stale:', error);
      setGenerationError(error instanceof Error ? error.message : 'Failed to mark stale');
    }
  };

  const getStatusVariant = () => {
    if (isGenerating) return "secondary";
    if (generationError) return "destructive";
    if (afterglow.id && !afterglow.is_stale) return "default";
    return "outline";
  };

  const getStatusText = () => {
    if (isGenerating) return "Generating...";
    if (generationError) return "Generation Failed";
    if (afterglow.id && !afterglow.is_stale) return "Generated";
    if (afterglow.id && afterglow.is_stale) return "Stale (Needs Update)";
    return "Not Generated";
  };

  const getStatusIcon = () => {
    if (isGenerating) return <Loader2 className="ml-1 h-3 w-3 animate-spin" />;
    if (generationError) return <AlertCircle className="ml-1 h-3 w-3" />;
    if (afterglow.id && !afterglow.is_stale) return <CheckCircle className="ml-1 h-3 w-3" />;
    if (afterglow.is_stale) return <Zap className="ml-1 h-3 w-3" />;
    return <Play className="ml-1 h-3 w-3" />;
  };

  return (
    <TooltipProvider>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Sparkles className="mr-2 h-5 w-5" />
            Step 4: Afterglow Generation Pipeline
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Status Overview */}
          <div className="flex items-center justify-between">
            <span>Today's Afterglow Status:</span>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge variant={getStatusVariant()}>
                  {getStatusText()}
                  {getStatusIcon()}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <p>
                  {isGenerating 
                    ? "AI is analyzing your day and generating insights..."
                    : generationError 
                    ? `Error: ${generationError}`
                    : afterglow.id 
                    ? `Generated ${afterglow.created_at ? new Date(afterglow.created_at).toLocaleTimeString() : 'today'}`
                    : "No afterglow generated yet for today"
                  }
                </p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Generation Metrics */}
          {afterglow.id && (
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div className="flex justify-between">
                <span>Energy Score:</span>
                <Badge variant="outline">{afterglow.energy_score || 0}/100</Badge>
              </div>
              <div className="flex justify-between">
                <span>Social Intensity:</span>
                <Badge variant="outline">{afterglow.social_intensity || 0}/100</Badge>
              </div>
              <div className="flex justify-between">
                <span>Venues Visited:</span>
                <Badge variant="outline">{afterglow.total_venues || 0}</Badge>
              </div>
              <div className="flex justify-between">
                <span>Floqs Joined:</span>
                <Badge variant="outline">{afterglow.total_floqs || 0}</Badge>
              </div>
            </div>
          )}

          {/* AI Summary Preview */}
          {afterglow.ai_summary && (
            <div className="p-3 bg-muted rounded-lg">
              <h4 className="font-medium text-sm mb-2">AI Summary:</h4>
              <p className="text-sm text-muted-foreground line-clamp-3">
                {afterglow.ai_summary}
              </p>
            </div>
          )}

          {/* Generation Controls */}
          <div className="flex gap-2">
            <Button 
              onClick={handleManualGeneration}
              disabled={isGenerating || isLoading}
              className="flex-1"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Generate Afterglow
                </>
              )}
            </Button>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  onClick={handleMarkStale}
                  disabled={isGenerating}
                >
                  <Zap className="h-4 w-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Mark as stale to test automatic regeneration</p>
              </TooltipContent>
            </Tooltip>
          </div>

          {/* Error Display */}
          {generationError && (
            <div className="p-3 bg-destructive/10 border border-destructive/20 rounded-lg">
              <div className="flex items-center text-destructive">
                <AlertCircle className="mr-2 h-4 w-4" />
                <span className="font-medium">Generation Error</span>
              </div>
              <p className="text-sm text-destructive/80 mt-1">{generationError}</p>
            </div>
          )}

          {/* Last Generation Info */}
          {lastGeneration && (
            <div className="text-xs text-muted-foreground">
              Last manual generation: {new Date(lastGeneration).toLocaleString()}
            </div>
          )}

          {/* Pipeline Status */}
          <div className="mt-4 text-sm text-muted-foreground space-y-1">
            <p>✅ Data recording triggers mark afterglow stale</p>
            <p>✅ Real-time subscriptions detect staleness changes</p>
            <p>✅ Edge function listener monitors for stale afterglows</p>
            <p className="font-semibold text-primary">🎯 NEW: Manual and automatic generation pipeline active!</p>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};