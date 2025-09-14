import * as React from 'react';
import { useVibeEngine } from '@/hooks/useVibeEngine';
import { VIBES } from '@/lib/vibes';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { RefreshCw, Download, Trash2, Settings } from 'lucide-react';
import { schedulePatternWork } from '@/utils/patternScheduler';
import { usePersonalityInsights } from '@/hooks/usePersonalityInsights';
import { intelligenceIntegration } from '@/lib/intelligence/IntelligenceIntegration';

export function VibeDebugPanel({ open = false }: { open?: boolean }) {
  const engine = useVibeEngine();
  const insights = usePersonalityInsights();
  const [isRecomputing, setIsRecomputing] = React.useState(false);
  
  if (!open || !engine) return null;
  const r = engine.productionReading;

  const handleRecomputePatterns = () => {
    setIsRecomputing(true);
    schedulePatternWork(() => {
      // Trigger pattern recomputation
      console.log('[Debug] Recomputing patterns...');
      setTimeout(() => setIsRecomputing(false), 1000);
    });
  };

  const handleClearCaches = () => {
    try {
      // Clear various caches
      localStorage.removeItem('vibe:personal:delta:v1');
      localStorage.removeItem('pattern-insights-cache-v1');
      localStorage.removeItem('venue-cache-v1');
      localStorage.removeItem('weather-cache-v1');
      intelligenceIntegration.reset();
      console.log('[Debug] Caches cleared');
    } catch (error) {
      console.error('[Debug] Failed to clear caches:', error);
    }
  };

  const downloadSnapshot = () => {
    const snapshot = {
      timestamp: new Date().toISOString(),
      reading: r,
      patterns: insights,
      engine: {
        currentVibe: engine.currentVibe,
        confidence: engine.confidence,
        components: engine.components
      }
    };
    
    const blob = new Blob([JSON.stringify(snapshot, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `vibe-snapshot-${Date.now()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed top-20 right-4 z-[700] bg-black/80 text-white p-3 rounded-lg border border-white/10 w-80 max-h-[80vh] overflow-y-auto">
      <div className="font-semibold mb-2 flex items-center justify-between">
        <span>Vibe Debug</span>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-white hover:bg-white/20"
            onClick={downloadSnapshot}
          >
            <Download className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-white hover:bg-white/20"
            onClick={handleClearCaches}
          >
            <Trash2 className="h-3 w-3" />
          </Button>
        </div>
      </div>
      <div className="text-sm mb-2">
        now: <span className="font-mono">{engine.currentVibe}</span> ({Math.floor(engine.confidence * 100)}%)
      </div>
      
      {/* Pattern Intelligence Status */}
      {engine.patterns && (
        <div className="mb-3 p-2 bg-white/5 rounded border border-white/10">
          <div className="text-xs font-medium mb-1">Pattern Intelligence</div>
          <div className="flex flex-wrap gap-1 mb-1">
            <Badge variant="outline" className="text-[10px] h-5">
              {engine.patterns.chronotype}
            </Badge>
            <Badge variant="outline" className="text-[10px] h-5">
              {engine.patterns.energyType}
            </Badge>
            <Badge variant="outline" className="text-[10px] h-5">
              {engine.patterns.socialType}
            </Badge>
          </div>
          <div className="text-[10px] opacity-70">
            {engine.patterns.correctionCount} corrections • {engine.patterns.consistency}
          </div>
        </div>
      )}
      
      {r && (
        <>
          <div className="text-xs opacity-80 mb-2">calc: {r.calcMs.toFixed(1)}ms</div>
          <div className="text-xs mb-1">components:</div>
          <div className="grid grid-cols-2 gap-1 text-xs mb-2">
            {Object.entries(r.components).map(([k, v]) => (
              <div key={k} className="flex justify-between">
                <span className="opacity-70">{k}</span>
                <span className="font-mono">{Math.floor(v * 100)}%</span>
              </div>
            ))}
          </div>
          <div className="text-xs mb-1">vector:</div>
          <div className="grid grid-cols-3 gap-y-1 text-[11px]">
            {VIBES.map(v => (
              <div key={v} className="flex justify-between">
                <span className={`font-mono ${engine.currentVibe === v ? 'text-pink-400' : ''}`}>{v}</span>
                <span className="font-mono">{Math.floor((r.vector[v] ?? 0) * 100)}%</span>
              </div>
            ))}
          </div>
          
          <Separator className="my-2 bg-white/10" />
          
          {/* Intelligence Controls */}
          <div className="space-y-2">
            <div className="text-xs font-medium">Intelligence Controls</div>
            <div className="flex gap-1">
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] text-white hover:bg-white/20"
                onClick={handleRecomputePatterns}
                disabled={isRecomputing}
              >
                <RefreshCw className={`h-2 w-2 mr-1 ${isRecomputing ? 'animate-spin' : ''}`} />
                {isRecomputing ? 'Computing...' : 'Recompute'}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-6 text-[10px] text-white hover:bg-white/20"
              >
                <Settings className="h-2 w-2 mr-1" />
                Mock Weather
              </Button>
            </div>
            
            {/* Performance Metrics */}
            <div className="text-[10px] opacity-70 space-y-1">
              <div>Calc: {r.calcMs.toFixed(1)}ms</div>
              <div>Interval: {engine.isProductionMode ? 'Adaptive' : 'Fixed'}</div>
              {insights && (
                <div>Pattern confidence: {Math.round(insights.confidence * 100)}%</div>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}