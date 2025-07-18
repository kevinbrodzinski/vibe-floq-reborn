
import { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Calendar, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AfterglowCard } from '@/components/AfterglowCard';
import { AfterglowGenerationProgress } from '@/components/AfterglowGenerationProgress';
import AfterglowCalendarDialog from '@/components/afterglow/AfterglowCalendarDialog';
import { useRealtimeAfterglowData } from '@/hooks/useRealtimeAfterglowData';
import { formatDateString, getTodayString } from '@/utils/date';

interface AfterglowScreenProps {
  date?: string;
}

export default function AfterglowScreen({ date: propDate }: AfterglowScreenProps) {
  const [params] = useSearchParams();
  const [calendarOpen, setCalendarOpen] = useState(false);
  
  // Use date from props, URL params, or default to today
  const date = propDate || params.get('date') || getTodayString();
  
  const { 
    afterglow, 
    generationProgress, 
    isGenerating,
    refresh,
    isStale,
    loading
  } = useRealtimeAfterglowData(date);

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/5 to-background">
      <div className="container mx-auto px-4 py-8 max-w-md">
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">
              {formatDateString(date)}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              On this day
            </p>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setCalendarOpen(true)}
            className="text-muted-foreground hover:text-foreground"
          >
            <Calendar className="w-5 h-5" />
          </Button>
        </div>

        {/* Generation Progress */}
        {isGenerating && generationProgress && (
          <div className="mb-6">
            <AfterglowGenerationProgress progress={generationProgress} />
          </div>
        )}

        {/* Loading State */}
        {loading && !afterglow && (
          <div className="flex flex-col items-center justify-center py-12">
            <Loader2 className="w-8 h-8 animate-spin text-primary mb-4" />
            <p className="text-muted-foreground">Loading your afterglow...</p>
          </div>
        )}

        {/* Afterglow Card - Always show, even with null data */}
        {!loading && (
          <AfterglowCard
            afterglow={afterglow}
            onRefresh={refresh}
            isStale={isStale}
            date={date}
          />
        )}

        {/* Calendar Dialog */}
        <AfterglowCalendarDialog
          open={calendarOpen}
          onOpenChange={setCalendarOpen}
        />
      </div>
    </div>
  );
}
