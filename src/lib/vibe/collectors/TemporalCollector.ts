// Temporal signal collector - tracks time-based context
import type { SignalCollector, TemporalSignal } from '@/types/vibe';

export class TemporalCollector implements SignalCollector {
  readonly name = 'temporal';
  
  private contextStartTime = Date.now();
  
  isAvailable(): boolean {
    // Time is always available
    return true;
  }

  async collect(): Promise<TemporalSignal | null> {
    try {
      const now = new Date();
      
      return {
        hourOfDay: now.getHours(),
        dayOfWeek: now.getDay(),
        isWeekend: now.getDay() === 0 || now.getDay() === 6,
        timeInCurrentContext: (Date.now() - this.contextStartTime) / (1000 * 60), // minutes
      };
    } catch (error) {
      console.warn('Temporal collection failed:', error);
      return null;
    }
  }

  getQuality(): number {
    // Temporal signals are always high quality
    return 1.0;
  }

  // Reset context timer (call when user changes location/activity significantly)
  resetContext() {
    this.contextStartTime = Date.now();
  }
}