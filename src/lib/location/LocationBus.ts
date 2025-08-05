import { supabase } from '@/integrations/supabase/client';
import type { MovementContext } from '@/types/location';

interface LocationUpdate {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
  h3_idx?: string; // Convert bigint to string for JSON compatibility
}

class LocationBus {
  private movements: MovementContext[] = [];

  async recordMovement(
    lat: number,
    lng: number,
    context?: MovementContext
  ) {
    try {
      const locationData: LocationUpdate = {
        lat,
        lng,
        accuracy: 50,
        timestamp: Date.now(),
      };

      // Store location update
      const { error } = await supabase
        .from('location_history')
        .insert([locationData]);

      if (error) {
        console.error('Error recording location:', error);
        return;
      }

      // Record movement context if provided
      if (context) {
        this.movements.push(context);
        // Keep only last 10 movements
        if (this.movements.length > 10) {
          this.movements = this.movements.slice(-10);
        }
      }

    } catch (error) {
      console.error('Error in recordMovement:', error);
    }
  }

  async processLocationData(data: LocationUpdate[]) {
    try {
      // Convert bigint to string for JSON compatibility
      const processedData = data.map(item => ({
        ...item,
        h3_idx: item.h3_idx?.toString() || null,
      }));

      const { data: result, error } = await supabase.rpc('process_location_batch', {
        location_data: processedData as any,
      });

      if (error) {
        console.error('Error processing location data:', error);
        return null;
      }

      // Type guard for the response
      if (typeof result === 'object' && result !== null) {
        const response = result as Record<string, any>;
        return {
          processed: response.processed || 0,
          spatial_strategy: response.spatial_strategy || 'default',
          duration_ms: response.duration_ms || 0,
        };
      }

      return null;
    } catch (error) {
      console.error('Error in processLocationData:', error);
      return null;
    }
  }

  getRecentMovements(): MovementContext[] {
    return [...this.movements];
  }

  clearMovements() {
    this.movements = [];
  }
}

export const locationBus = new LocationBus();
