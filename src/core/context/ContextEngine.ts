import { ContextTruthLedger } from './ContextTruthLedger';
import { ContextSynthesisGraph } from './ContextSynthesisGraph';
import { WorkingSetManager } from './WorkingSetManager';
import type { ContextFactWithId, WorkingSet } from './types';
import type { ApplicationContext } from './WorkingSetManager';
import type { ContextSynthesis } from './ContextSynthesisGraph';

export interface Interaction {
  type: string;
  target?: string;
  data?: any;
  timestamp: number;
}

export interface ContextValue {
  factId?: string;
  synthesis: ContextSynthesis | null;
  workingSet: WorkingSet | null;
  metadata: {
    performance: {
      processingTime: number;
      memoryUsage: number;
    };
    confidence: number;
  };
}

/**
 * Context Engine - Orchestrates the complete Context AI system
 * Integrates fact ledger, synthesis graph, and working set management
 */
export class ContextEngine {
  private ledger = new ContextTruthLedger();
  private graph = new ContextSynthesisGraph();
  private workingSetManager = new WorkingSetManager();
  
  private currentContext: ApplicationContext | null = null;
  private previousContext: ApplicationContext | null = null;
  private lastTransition = Date.now();
  private initialized = false;

  async initialize(context: ApplicationContext): Promise<void> {
    if (this.initialized) return;
    
    this.currentContext = context;
    this.initialized = true;
    
    // Start session tracking
    if (!localStorage.getItem('session_start')) {
      localStorage.setItem('session_start', Date.now().toString());
    }
    
    // Try to restore previous working set
    const savedWorkingSet = await this.workingSetManager.load();
    if (savedWorkingSet) {
      await this.workingSetManager.restore(savedWorkingSet);
    }
  }

  async maintain(interaction: Interaction): Promise<ContextValue> {
    const startTime = performance.now();
    
    try {
      // 1. Record immutable fact
      let factId: string | undefined;
      const fact = this.extractFact(interaction);
      if (fact) {
        factId = await this.ledger.append(fact);
      }

      // 2. Update synthesis
      const recentFacts = await this.ledger.getRecent(1000);
      const synthesis = await this.graph.synthesize(recentFacts);

      // 3. Extract current working set
      const workingSet = this.currentContext 
        ? await this.workingSetManager.extract(this.currentContext)
        : null;

      // 4. Save working set for persistence
      if (workingSet) {
        await this.workingSetManager.save(workingSet);
      }

      // 5. Update context tracking
      this.updateContextTracking();

      const processingTime = performance.now() - startTime;
      
      return {
        factId,
        synthesis,
        workingSet,
        metadata: {
          performance: {
            processingTime,
            memoryUsage: this.getMemoryUsage()
          },
          confidence: this.calculateConfidence(synthesis)
        }
      };
    } catch (error) {
      console.error('Context engine error:', error);
      
      return {
        synthesis: null,
        workingSet: null,
        metadata: {
          performance: {
            processingTime: performance.now() - startTime,
            memoryUsage: this.getMemoryUsage()
          },
          confidence: 0
        }
      };
    }
  }

  async recordFact(fact: Omit<ContextFactWithId, 'id' | 'timestamp' | 'hash'>): Promise<string> {
    return this.ledger.append(fact);
  }

  async getWorkingSet(): Promise<WorkingSet | null> {
    if (!this.currentContext) return null;
    return this.workingSetManager.extract(this.currentContext);
  }

  async restoreWorkingSet(workingSet: WorkingSet): Promise<void> {
    return this.workingSetManager.restore(workingSet);
  }

  async getRecentFacts(limit: number = 100): Promise<ContextFactWithId[]> {
    return this.ledger.getRecent(limit);
  }

  getCurrentSynthesis(): ContextSynthesis | null {
    return this.graph.getLatestSynthesis();
  }

  updateContext(context: ApplicationContext): void {
    this.previousContext = this.currentContext;
    this.currentContext = context;
    this.lastTransition = Date.now();
  }

  private extractFact(interaction: Interaction): Omit<ContextFactWithId, 'id' | 'timestamp' | 'hash'> | null {
    switch (interaction.type) {
      case 'vibe_correction':
        return {
          type: 'vibe_correction',
          data: {
            from: interaction.data?.from,
            to: interaction.data?.to,
            components: interaction.data?.components || {},
            confidence: interaction.data?.confidence || 0.5
          }
        };
        
      case 'venue_visited':
        return {
          type: 'venue_transition',
          data: {
            from: interaction.data?.from || null,
            to: interaction.data?.to || null,
            dwellTime: interaction.data?.dwellTime || 0,
            energyImpact: interaction.data?.energyImpact || 0
          }
        };
        
      case 'pattern_detected':
        return {
          type: 'pattern_detected',
          data: {
            pattern: interaction.data?.pattern || 'unknown',
            confidence: interaction.data?.confidence || 0.5,
            category: interaction.data?.category || 'behavioral'
          }
        };
        
      case 'recommendation_action':
        return {
          type: 'recommendation_acted',
          data: {
            action: interaction.data?.action || 'unknown',
            outcome: interaction.data?.outcome || 'neutral',
            context: interaction.data?.context || ''
          }
        };
        
      default:
        // Don't record unknown interaction types
        return null;
    }
  }

  private updateContextTracking(): void {
    // Update transition tracking
    if (this.previousContext && this.currentContext) {
      const transitionDuration = Date.now() - this.lastTransition;
      
      // Could record transition facts here
      // Future: implement transition graph
    }
  }

  private calculateConfidence(synthesis: ContextSynthesis | null): number {
    if (!synthesis) return 0;
    
    return synthesis.metadata.confidence;
  }

  private getMemoryUsage(): number {
    if ('memory' in performance) {
      return (performance as any).memory.usedJSHeapSize / (1024 * 1024);
    }
    return 0;
  }

  // Event handling for common context changes
  onVibeCorrection(from: string, to: string, components: any, confidence: number): void {
    this.maintain({
      type: 'vibe_correction',
      data: { from, to, components, confidence },
      timestamp: Date.now()
    });
  }

  onVenueTransition(from: string | null, to: string | null, dwellTime: number): void {
    this.maintain({
      type: 'venue_visited',
      data: { from, to, dwellTime, energyImpact: 0.5 },
      timestamp: Date.now()
    });
  }

  onPatternDetected(pattern: string, confidence: number, category: string): void {
    this.maintain({
      type: 'pattern_detected',
      data: { pattern, confidence, category },
      timestamp: Date.now()
    });
  }

  onRecommendationAction(action: string, outcome: string, context: string): void {
    this.maintain({
      type: 'recommendation_action',
      data: { action, outcome, context },
      timestamp: Date.now()
    });
  }
}