import { Brain, Clock, MapPin, TrendingUp } from "lucide-react";
import type { Vibe } from "@/utils/vibe";

interface LearningPattern {
  context: string;
  preferredVibe: Vibe;
  confidence: number;
}

interface LearningPatternsProps {
  patterns: LearningPattern[];
  topPreferences: Partial<Record<Vibe, number>>;
  accuracy: number;
  correctionCount: number;
}

export const LearningPatterns = ({ 
  patterns, 
  topPreferences, 
  accuracy, 
  correctionCount 
}: LearningPatternsProps) => {
  const topVibes = Object.entries(topPreferences)
    .sort(([, a], [, b]) => (b || 0) - (a || 0))
    .slice(0, 3);

  if (correctionCount === 0) {
    return (
      <div className="bg-card/40 backdrop-blur-xl rounded-xl p-4 border border-border/30">
        <div className="flex items-center gap-2 mb-3">
          <Brain className="w-4 h-4 text-accent" />
          <h4 className="font-medium text-foreground">Personal Learning</h4>
        </div>
        <div className="text-center py-3">
          <p className="text-sm text-muted-foreground mb-2">
            Help me learn your preferences
          </p>
          <p className="text-xs text-muted-foreground/60">
            Accept or correct auto-detected vibes to improve accuracy
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-card/40 backdrop-blur-xl rounded-xl p-4 border border-border/30">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <Brain className="w-4 h-4 text-accent" />
          <h4 className="font-medium text-foreground">Learning Progress</h4>
        </div>
        <div className="px-2 py-1 rounded-full bg-accent/10 border border-accent/20 text-xs text-accent font-medium tracking-wide">
          {Math.round(accuracy * 100)}% • {correctionCount} corrections
        </div>
      </div>

      {/* Top Preferences */}
      {topVibes.length > 0 && (
        <div className="mb-4">
          <p className="text-xs text-muted-foreground mb-2">Your favorite vibes:</p>
          <div className="flex gap-2">
            {topVibes.map(([vibe, score], index) => (
              <div 
                key={vibe}
                className="px-2 py-1 rounded-lg bg-primary/10 border border-primary/20 text-xs"
              >
                <span className="capitalize font-medium text-primary">{vibe}</span>
                <span className="text-muted-foreground ml-1">
                  {Math.round((score || 0) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Context Patterns */}
      {patterns.length > 0 && (
        <div className="mb-3">
          <p className="text-xs text-muted-foreground mb-2">Learned patterns:</p>
          <div className="space-y-2">
            {patterns.slice(0, 3).map((pattern, index) => (
              <div key={index} className="flex items-center gap-2 text-xs">
                <div className="w-1.5 h-1.5 rounded-full bg-accent"></div>
                <span className="text-muted-foreground">{pattern.context}:</span>
                <span className="capitalize font-medium text-foreground">
                  {pattern.preferredVibe}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Learning Stats */}
      <div className="text-xs text-muted-foreground/60 border-t border-border/20 pt-2">
        {correctionCount} corrections • Learning improves over time
      </div>
    </div>
  );
};