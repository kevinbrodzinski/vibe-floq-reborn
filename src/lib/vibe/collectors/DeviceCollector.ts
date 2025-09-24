// Device signal collector - monitors device state for context
import type { SignalCollector, DeviceSignal } from '@/types/vibe';

export class DeviceCollector implements SignalCollector<DeviceSignal> {
  readonly name = 'device';

  isAvailable(): boolean {
    // Device info is available in most browser environments
    return typeof navigator !== 'undefined';
  }

  async collect(): Promise<DeviceSignal | null> {
    try {
      const signal: DeviceSignal = {
        batteryLevel: await this.getBatteryLevel(),
        connectionQuality: this.getConnectionQuality(),
        isCharging: await this.getChargingStatus(),
        brightness: this.getBrightness(),
      };

      return signal;
    } catch (error) {
      console.warn('Device collection failed:', error);
      return null;
    }
  }

  getQuality(): number {
    // Device signals are moderately reliable
    return 0.7;
  }

  private async getBatteryLevel(): Promise<number> {
    try {
      // Battery API (deprecated but still available in some browsers)
      if ('getBattery' in navigator) {
        const battery = await (navigator as any).getBattery();
        return battery.level;
      }
    } catch {
      // Fallback: assume mid-range battery
    }
    
    return 0.5; // Default assumption
  }

  private async getChargingStatus(): Promise<boolean> {
    try {
      if ('getBattery' in navigator) {
        const battery = await (navigator as any).getBattery();
        return battery.charging;
      }
    } catch {
      // Fallback
    }
    
    return false; // Default assumption
  }

  private getConnectionQuality(): DeviceSignal['connectionQuality'] {
    try {
      // Network Information API
      if ('connection' in navigator) {
        const connection = (navigator as any).connection;
        const effectiveType = connection.effectiveType;
        
        switch (effectiveType) {
          case 'slow-2g':
          case '2g':
            return 'poor';
          case '3g':
            return 'fair';
          case '4g':
            return 'good';
          default:
            return 'excellent';
        }
      }
    } catch {
      // Fallback
    }
    
    return 'good'; // Default assumption
  }

  private getBrightness(): number | undefined {
    try {
      // Screen brightness is not typically available via web APIs
      // This would require native app integration
      
      // Rough estimation based on time of day
      const hour = new Date().getHours();
      if (hour >= 6 && hour <= 18) {
        return 0.8; // Daytime - likely higher brightness
      } else {
        return 0.3; // Nighttime - likely lower brightness
      }
    } catch {
      return undefined;
    }
  }
}