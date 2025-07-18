
import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Calendar, Sparkles } from 'lucide-react';
import { AfterglowCard } from '@/components/AfterglowCard';
import { useRealtimeAfterglowData } from '@/hooks/useRealtimeAfterglowData';
import AfterglowCalendarDialog from '@/components/afterglow/AfterglowCalendarDialog';

interface AfterglowScreenProps {
  date: string;
}

export default function AfterglowScreen({ date }: AfterglowScreenProps) {
  const [calendarOpen, setCalendarOpen] = useState(false);
  const { 
    afterglow, 
    isGenerating, 
    generationProgress, 
    refresh, 
    isStale, 
    loading 
  } = useRealtimeAfterglowData(date);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <div className="text-center space-y-4">
          <div className="animate-pulse">
            <Sparkles className="w-8 h-8 mx-auto text-primary" />
          </div>
          <p className="text-muted-foreground">Loading your afterglow...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white font-space-grotesk">
      {/* Header with wordmark and icons */}
      <div className="flex justify-between items-start p-6 pt-16">
        <div>
          <h1 className="text-4xl font-light text-white lowercase font-space-grotesk">
            afterglow
          </h1>
        </div>
        <div className="flex space-x-4">
          <Button 
            variant="ghost" 
            size="icon"
            onClick={() => setCalendarOpen(true)}
            className="text-slate-400 hover:text-white h-auto w-auto p-2"
          >
            <Calendar className="h-[22px] w-[22px]" strokeWidth={1.5} />
          </Button>
          <Button 
            variant="ghost" 
            size="icon"
            className="text-slate-400 hover:text-white h-auto w-auto p-2"
          >
            <Sparkles className="h-[22px] w-[22px]" strokeWidth={1.5} />
          </Button>
        </div>
      </div>

      {/* Main content */}
      <div className="px-4 pb-6 space-y-6">
        {/* Generation progress indicator */}
        {isGenerating && generationProgress && (
          <div className="bg-slate-800/50 backdrop-blur-sm rounded-lg p-4 border border-slate-700/50">
            <div className="flex items-center space-x-3">
              <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
              <div className="flex-1">
                <p className="text-sm font-medium text-white">
                  {generationProgress.step}
                </p>
                <p className="text-xs text-slate-400">
                  {generationProgress.message}
                </p>
              </div>
            </div>
            <div className="mt-3 w-full bg-slate-700 rounded-full h-2">
              <div 
                className="bg-gradient-to-r from-primary to-secondary h-2 rounded-full transition-all duration-300"
                style={{ width: `${generationProgress.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Afterglow Card */}
        {afterglow ? (
          <AfterglowCard 
            afterglow={afterglow} 
            onRefresh={refresh}
            isStale={isStale}
          />
        ) : (
          <div className="text-center py-12 space-y-4">
            <Sparkles className="w-12 h-12 mx-auto text-slate-600" />
            <div className="space-y-2">
              <h3 className="text-xl font-semibold text-slate-300">
                No afterglow yet
              </h3>
              <p className="text-sm text-slate-500 max-w-sm mx-auto">
                Your daily energy summary will appear here once you've been active.
              </p>
            </div>
            <Button 
              onClick={refresh}
              className="mt-4 bg-gradient-to-r from-primary to-secondary hover:from-primary/90 hover:to-secondary/90"
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Generate Afterglow
            </Button>
          </div>
        )}
      </div>

      {/* Calendar Dialog */}
      <AfterglowCalendarDialog 
        open={calendarOpen} 
        onOpenChange={setCalendarOpen}
      />
    </div>
  );
}
