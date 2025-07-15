import type { SensorData } from './VibeAnalysisEngine';

export interface SensorFeatures {
  energy: number; // 0-1 overall energy level
  social: number; // 0-1 social context likelihood
  focus: number; // 0-1 focused activity likelihood
  mood: number; // 0-1 positive mood indicator
  anomaly: number; // 0-1 unusual pattern detection
}

export interface SensorQuality {
  overall: number;
  audio: number;
  motion: number;
  light: number;
  location: number;
}

export interface FusionResult {
  features: SensorFeatures;
  quality: SensorQuality;
  dominantFactors: string[];
  environmentalMatch: number;
  rawSensors: SensorData;
}

/**
 * Sensor Fusion System
 * 
 * Combines multiple sensor inputs with weighted reliability,
 * cross-validation, and feature extraction.
 */
export class SensorFusion {
  // Sensor reliability weights (sum to 1.0)
  private readonly SENSOR_WEIGHTS = {
    audio: 0.4,
    motion: 0.3,
    light: 0.2,
    location: 0.1
  };

  // Quality thresholds
  private readonly QUALITY_THRESHOLDS = {
    audio: { min: 5, max: 95 }, // Avoid floor/ceiling effects
    motion: { min: 1, max: 100 },
    light: { min: 10, max: 90 },
    location: { min: 0, max: 100 }
  };

  /**
   * Main fusion method - combines sensor data into unified features
   */
  fuseSensorData(sensors: SensorData): FusionResult {
    // Step 1: Assess sensor quality
    const quality = this.assessSensorQuality(sensors);
    
    // Step 2: Extract features from each sensor
    const audioFeatures = this.extractAudioFeatures(sensors.audioLevel, quality.audio);
    const motionFeatures = this.extractMotionFeatures(sensors.movement, quality.motion);
    const lightFeatures = this.extractLightFeatures(sensors.lightLevel, quality.light);
    const locationFeatures = this.extractLocationFeatures(sensors.location, quality.location);
    
    // Step 3: Weighted feature fusion
    const features = this.fuseFeatures(
      audioFeatures,
      motionFeatures,
      lightFeatures,
      locationFeatures,
      quality
    );
    
    // Step 4: Cross-validation and anomaly detection
    const { validatedFeatures, anomalyScore } = this.crossValidateFeatures(
      features,
      { audioFeatures, motionFeatures, lightFeatures, locationFeatures }
    );
    
    // Step 5: Determine dominant factors
    const dominantFactors = this.identifyDominantFactors(
      sensors,
      quality,
      validatedFeatures
    );
    
    // Step 6: Calculate environmental match
    const environmentalMatch = this.calculateEnvironmentalMatch(
      validatedFeatures,
      sensors
    );
    
    return {
      features: { ...validatedFeatures, anomaly: anomalyScore },
      quality,
      dominantFactors,
      environmentalMatch,
      rawSensors: sensors
    };
  }

  /**
   * Assess quality of each sensor input
   */
  private assessSensorQuality(sensors: SensorData): SensorQuality {
    const { audio, motion, light, location } = this.QUALITY_THRESHOLDS;
    
    // Audio quality - avoid silence and saturation
    const audioQuality = sensors.audioLevel >= audio.min && sensors.audioLevel <= audio.max ? 
      1.0 - Math.abs(sensors.audioLevel - 50) / 50 : 0.3;
    
    // Motion quality - based on consistency and reasonableness
    const motionQuality = sensors.movement.intensity >= motion.min ? 
      Math.min(1.0, sensors.movement.intensity / 30) : 0.2;
    
    // Light quality - avoid extreme readings
    const lightQuality = sensors.lightLevel >= light.min && sensors.lightLevel <= light.max ?
      0.8 : 0.4;
    
    // Location quality - based on context certainty
    const locationQuality = sensors.location.context !== 'unknown' ? 0.7 : 0.2;
    
    const overall = (
      audioQuality * this.SENSOR_WEIGHTS.audio +
      motionQuality * this.SENSOR_WEIGHTS.motion +
      lightQuality * this.SENSOR_WEIGHTS.light +
      locationQuality * this.SENSOR_WEIGHTS.location
    );
    
    return {
      overall,
      audio: audioQuality,
      motion: motionQuality,
      light: lightQuality,
      location: locationQuality
    };
  }

  /**
   * Extract features from audio sensor
   */
  private extractAudioFeatures(audioLevel: number, quality: number): Partial<SensorFeatures> {
    const normalized = audioLevel / 100;
    
    return {
      energy: normalized * quality,
      social: normalized > 0.6 ? (normalized - 0.6) * 2.5 * quality : 0,
      focus: normalized < 0.3 ? (0.3 - normalized) * 3.33 * quality : 0,
      mood: Math.min(1, normalized * 1.2) * quality
    };
  }

  /**
   * Extract features from motion sensor
   */
  private extractMotionFeatures(movement: SensorData['movement'], quality: number): Partial<SensorFeatures> {
    const intensity = movement.intensity / 100;
    const patternWeight = {
      still: 0,
      walking: 0.4,
      active: 0.7,
      dancing: 1.0
    }[movement.pattern];
    
    return {
      energy: intensity * patternWeight * quality,
      social: movement.pattern === 'dancing' ? 0.8 * quality : 0,
      focus: movement.pattern === 'still' ? 0.7 * quality : 0,
      mood: patternWeight * quality
    };
  }

  /**
   * Extract features from light sensor
   */
  private extractLightFeatures(lightLevel: number, quality: number): Partial<SensorFeatures> {
    const normalized = lightLevel / 100;
    
    return {
      energy: normalized * quality,
      social: normalized > 0.7 ? (normalized - 0.7) * 3.33 * quality : 0,
      focus: normalized > 0.5 && normalized < 0.8 ? 0.6 * quality : 0,
      mood: normalized > 0.4 ? (normalized - 0.4) * 1.67 * quality : 0
    };
  }

  /**
   * Extract features from location sensor
   */
  private extractLocationFeatures(location: SensorData['location'], quality: number): Partial<SensorFeatures> {
    const contextWeights = {
      venue: { social: 0.8, energy: 0.6, mood: 0.7, focus: 0.2 },
      outdoor: { energy: 0.6, mood: 0.8, focus: 0.3, social: 0.4 },
      indoor: { focus: 0.7, social: 0.4, energy: 0.3, mood: 0.4 },
      transport: { focus: 0.5, energy: 0.3, social: 0.2, mood: 0.3 },
      unknown: { energy: 0.1, social: 0.1, focus: 0.1, mood: 0.1 }
    };
    
    const weights = contextWeights[location.context] || contextWeights.unknown;
    const densityFactor = Math.min(1, location.density / 100);
    
    return {
      energy: (weights.energy || 0) * quality,
      social: (weights.social || 0) * (1 + densityFactor) * quality,
      focus: (weights.focus || 0) * (1 - densityFactor * 0.5) * quality,
      mood: (weights.mood || 0) * quality
    };
  }

  /**
   * Combine features with weighted fusion
   */
  private fuseFeatures(
    audio: Partial<SensorFeatures>,
    motion: Partial<SensorFeatures>,
    light: Partial<SensorFeatures>,
    location: Partial<SensorFeatures>,
    quality: SensorQuality
  ): SensorFeatures {
    const features = ['energy', 'social', 'focus', 'mood'] as const;
    const result: any = {};
    
    features.forEach(feature => {
      const audioVal = (audio[feature] || 0) * this.SENSOR_WEIGHTS.audio * quality.audio;
      const motionVal = (motion[feature] || 0) * this.SENSOR_WEIGHTS.motion * quality.motion;
      const lightVal = (light[feature] || 0) * this.SENSOR_WEIGHTS.light * quality.light;
      const locationVal = (location[feature] || 0) * this.SENSOR_WEIGHTS.location * quality.location;
      
      result[feature] = Math.min(1, audioVal + motionVal + lightVal + locationVal);
    });
    
    return result as SensorFeatures;
  }

  /**
   * Cross-validate features and detect anomalies
   */
  private crossValidateFeatures(
    features: SensorFeatures,
    individualFeatures: any
  ): { validatedFeatures: SensorFeatures; anomalyScore: number } {
    let anomalyScore = 0;
    const validated = { ...features };
    
    // Check for contradictory signals
    const { audioFeatures, motionFeatures } = individualFeatures;
    
    // High audio but no motion energy (possible audio interference)
    if ((audioFeatures.energy || 0) > 0.7 && (motionFeatures.energy || 0) < 0.2) {
      anomalyScore += 0.3;
      validated.energy *= 0.8; // Reduce confidence in energy reading
    }
    
    // High social but very low energy (unusual combination)
    if (features.social > 0.7 && features.energy < 0.3) {
      anomalyScore += 0.2;
    }
    
    // Very high focus but high social (contradictory)
    if (features.focus > 0.8 && features.social > 0.6) {
      anomalyScore += 0.3;
      validated.focus *= 0.7;
      validated.social *= 0.7;
    }
    
    return { validatedFeatures: validated, anomalyScore: Math.min(1, anomalyScore) };
  }

  /**
   * Identify which sensors are driving the analysis
   */
  private identifyDominantFactors(
    sensors: SensorData,
    quality: SensorQuality,
    features: SensorFeatures
  ): string[] {
    const factors: Array<{ name: string; strength: number }> = [];
    
    // Audio dominance
    if (sensors.audioLevel > 50 && quality.audio > 0.6) {
      factors.push({ name: 'audio', strength: sensors.audioLevel * quality.audio });
    }
    
    // Motion dominance
    if (sensors.movement.intensity > 20 && quality.motion > 0.5) {
      factors.push({ name: 'motion', strength: sensors.movement.intensity * quality.motion });
    }
    
    // Light dominance (extreme values)
    if ((sensors.lightLevel < 30 || sensors.lightLevel > 70) && quality.light > 0.5) {
      factors.push({ name: 'light', strength: Math.abs(sensors.lightLevel - 50) * quality.light });
    }
    
    // Location dominance
    if (sensors.location.context !== 'unknown' && quality.location > 0.5) {
      factors.push({ name: 'location', strength: 50 * quality.location });
    }
    
    // Return top 2 dominant factors
    return factors
      .sort((a, b) => b.strength - a.strength)
      .slice(0, 2)
      .map(f => f.name);
  }

  /**
   * Calculate how well features match expected environment
   */
  private calculateEnvironmentalMatch(
    features: SensorFeatures,
    sensors: SensorData
  ): number {
    let match = 0.5; // Start at neutral
    
    // High energy + movement = good match
    if (features.energy > 0.6 && sensors.movement.intensity > 30) {
      match += 0.3;
    }
    
    // Social features + location context
    if (features.social > 0.6 && sensors.location.context === 'venue') {
      match += 0.2;
    }
    
    // Focus + quiet environment
    if (features.focus > 0.6 && sensors.audioLevel < 30) {
      match += 0.2;
    }
    
    // Penalize contradictions
    if (features.social > 0.7 && features.focus > 0.7) {
      match -= 0.2;
    }
    
    return Math.max(0, Math.min(1, match));
  }
}