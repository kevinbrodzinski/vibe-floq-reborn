export interface Interaction {
  type: string;
  timestamp: number;
  target?: string;
  data?: any;
  duration?: number;
}

export interface FrictionSignal {
  type: 'hesitation' | 'backtracking' | 'repetition' | 'abandonment' | 'correction_pattern';
  confidence: number;
  context: any;
  timestamp: number;
  metadata?: any;
}

export interface Intervention {
  type: 'pre-emptive' | 'real-time' | 'retrospective' | 'systemic' | 'adaptive';
  action: string;
  target: any;
  confidence: number;
  implementation: () => void;
}

export interface FrictionPattern {
  id: string;
  type: string;
  occurrences: number;
  lastSeen: number;
  confidence: number;
}

/**
 * Friction Detector - Identifies user friction patterns and generates interventions
 * Analyzes interaction patterns to detect hesitation, backtracking, and other friction signals
 */
export class FrictionDetector {
  private patterns = new Map<string, FrictionPattern>();
  private interventions = new Map<string, Intervention>();
  private readonly HESITATION_THRESHOLD = 3000; // 3 seconds
  private readonly REPETITION_THRESHOLD = 3; // 3 repeated actions

  detect(interactions: Interaction[]): FrictionSignal[] {
    const signals: FrictionSignal[] = [];
    
    // Detect hesitation (time between actions > threshold)
    const hesitations = this.detectHesitation(interactions);
    signals.push(...hesitations);
    
    // Detect backtracking (undo/back navigation)
    const backtracking = this.detectBacktracking(interactions);
    signals.push(...backtracking);
    
    // Detect repetition (same action multiple times)
    const repetitions = this.detectRepetition(interactions);
    signals.push(...repetitions);
    
    // Detect abandonment (incomplete flows)
    const abandonments = this.detectAbandonment(interactions);
    signals.push(...abandonments);
    
    // Detect correction patterns (multiple vibe corrections)
    const corrections = this.detectCorrectionPatterns(interactions);
    signals.push(...corrections);
    
    return signals;
  }

  generateIntervention(signal: FrictionSignal): Intervention {
    switch (signal.type) {
      case 'hesitation':
        return {
          type: 'pre-emptive',
          action: 'auto-suggest',
          target: signal.context,
          confidence: signal.confidence,
          implementation: () => this.showAutoSuggestion(signal)
        };
        
      case 'backtracking':
        return {
          type: 'real-time',
          action: 'offer-shortcut',
          target: signal.context,
          confidence: signal.confidence,
          implementation: () => this.createShortcut(signal)
        };
        
      case 'repetition':
        return {
          type: 'retrospective',
          action: 'learn-pattern',
          target: signal.context,
          confidence: signal.confidence,
          implementation: () => this.storePattern(signal)
        };
        
      case 'abandonment':
        return {
          type: 'systemic',
          action: 'simplify-flow',
          target: signal.context,
          confidence: signal.confidence,
          implementation: () => this.simplifyFlow(signal)
        };
        
      case 'correction_pattern':
        return {
          type: 'adaptive',
          action: 'adjust-prediction',
          target: signal.context,
          confidence: signal.confidence,
          implementation: () => this.adjustPredictionModel(signal)
        };
        
      default:
        return {
          type: 'retrospective',
          action: 'log-pattern',
          target: signal.context,
          confidence: 0.1,
          implementation: () => console.log('Unknown friction pattern:', signal)
        };
    }
  }

  private detectHesitation(interactions: Interaction[]): FrictionSignal[] {
    const signals: FrictionSignal[] = [];
    
    for (let i = 1; i < interactions.length; i++) {
      const timeBetween = interactions[i].timestamp - interactions[i - 1].timestamp;
      
      if (timeBetween > this.HESITATION_THRESHOLD) {
        signals.push({
          type: 'hesitation',
          confidence: Math.min(0.9, timeBetween / 10000), // Higher confidence for longer hesitation
          context: {
            previousAction: interactions[i - 1].type,
            nextAction: interactions[i].type,
            duration: timeBetween
          },
          timestamp: interactions[i].timestamp,
          metadata: { duration: timeBetween }
        });
      }
    }
    
    return signals;
  }

  private detectBacktracking(interactions: Interaction[]): FrictionSignal[] {
    const signals: FrictionSignal[] = [];
    const backActions = ['back', 'undo', 'cancel', 'close'];
    
    interactions.forEach((interaction, index) => {
      if (backActions.some(action => interaction.type.includes(action))) {
        signals.push({
          type: 'backtracking',
          confidence: 0.8,
          context: {
            action: interaction.type,
            previousActions: interactions.slice(Math.max(0, index - 3), index)
              .map(i => i.type)
          },
          timestamp: interaction.timestamp
        });
      }
    });
    
    return signals;
  }

  private detectRepetition(interactions: Interaction[]): FrictionSignal[] {
    const signals: FrictionSignal[] = [];
    const actionCounts = new Map<string, number>();
    
    // Count consecutive similar actions
    let currentAction: string | null = null;
    let currentCount = 0;
    
    interactions.forEach(interaction => {
      if (interaction.type === currentAction) {
        currentCount++;
      } else {
        if (currentCount >= this.REPETITION_THRESHOLD && currentAction) {
          signals.push({
            type: 'repetition',
            confidence: Math.min(0.9, currentCount / 10),
            context: {
              action: currentAction,
              count: currentCount
            },
            timestamp: interaction.timestamp
          });
        }
        currentAction = interaction.type;
        currentCount = 1;
      }
    });
    
    return signals;
  }

  private detectAbandonment(interactions: Interaction[]): FrictionSignal[] {
    const signals: FrictionSignal[] = [];
    
    // Look for incomplete flows (started but not finished)
    const incompleteFlows = this.identifyIncompleteFlows(interactions);
    
    incompleteFlows.forEach(flow => {
      signals.push({
        type: 'abandonment',
        confidence: 0.7,
        context: {
          flow: flow.type,
          completedSteps: flow.completedSteps,
          totalSteps: flow.totalSteps
        },
        timestamp: flow.lastAction
      });
    });
    
    return signals;
  }

  private detectCorrectionPatterns(interactions: Interaction[]): FrictionSignal[] {
    const signals: FrictionSignal[] = [];
    const corrections = interactions.filter(i => i.type.includes('correction'));
    
    if (corrections.length > 3) {
      signals.push({
        type: 'correction_pattern',
        confidence: Math.min(0.9, corrections.length / 10),
        context: {
          correctionCount: corrections.length,
          pattern: 'frequent_corrections'
        },
        timestamp: Date.now()
      });
    }
    
    return signals;
  }

  private identifyIncompleteFlows(interactions: Interaction[]): any[] {
    // Placeholder for flow analysis
    // Future: implement proper flow detection
    return [];
  }

  private showAutoSuggestion(signal: FrictionSignal): void {
    window.dispatchEvent(new CustomEvent('friction:auto_suggest', {
      detail: {
        suggestion: 'Based on your pause, would you like help?',
        context: signal.context
      }
    }));
  }

  private createShortcut(signal: FrictionSignal): void {
    window.dispatchEvent(new CustomEvent('friction:shortcut_created', {
      detail: {
        shortcut: `Shortcut for ${signal.context.action}`,
        context: signal.context
      }
    }));
  }

  private storePattern(signal: FrictionSignal): void {
    const patternId = `${signal.type}_${signal.context.action}`;
    const existing = this.patterns.get(patternId);
    
    if (existing) {
      existing.occurrences++;
      existing.lastSeen = Date.now();
      existing.confidence = Math.min(0.9, existing.confidence + 0.1);
    } else {
      this.patterns.set(patternId, {
        id: patternId,
        type: signal.type,
        occurrences: 1,
        lastSeen: Date.now(),
        confidence: signal.confidence
      });
    }
  }

  private simplifyFlow(signal: FrictionSignal): void {
    window.dispatchEvent(new CustomEvent('friction:simplify_flow', {
      detail: {
        flow: signal.context.flow,
        recommendation: 'Consider simplifying this user flow'
      }
    }));
  }

  private adjustPredictionModel(signal: FrictionSignal): void {
    window.dispatchEvent(new CustomEvent('friction:adjust_model', {
      detail: {
        pattern: signal.context.pattern,
        adjustment: 'Prediction model needs refinement'
      }
    }));
  }

  getPatterns(): FrictionPattern[] {
    return Array.from(this.patterns.values());
  }

  getInterventions(): Intervention[] {
    return Array.from(this.interventions.values());
  }
}