import type { SensorData } from './VibeAnalysisEngine';

export interface SensorFeatures {
  energy: number; // 0-1 overall energy level
  social: number; // 0-1 social context likelihood
  focus: number; // 0-1 focused activity likelihood
  mood: number; // 0-1 positive mood indicator
  anomaly: number; // 0-1 unusual pattern detection
  // New enhanced features
  stability: number; // 0-1 signal stability over time
  coherence: number; // 0-1 cross-sensor coherence
  confidence: number; // 0-1 overall confidence in reading
}

export interface SensorQuality {
  overall: number;
  audio: number;
  motion: number;
  light: number;
  location: number;
  // New quality metrics
  temporal: number; // Quality of temporal consistency
  crossCorrelation: number; // How well sensors agree
}

export interface FusionResult {
  features: SensorFeatures;
  quality: SensorQuality;
  dominantFactors: string[];
  environmentalMatch: number;
  rawSensors: SensorData;
  // New analysis metrics
  signalToNoise: number;
  temporalTrends: {
    energy: 'increasing' | 'decreasing' | 'stable';
    social: 'increasing' | 'decreasing' | 'stable';
    stability: number;
  };
}

/**
 * Enhanced Sensor Fusion System
 * 
 * Combines multiple sensor inputs with weighted reliability,
 * cross-validation, feature extraction, and advanced signal processing.
 */
export class SensorFusion {
  // Enhanced sensor reliability weights with adaptive adjustment
  private sensorWeights = {
    audio: 0.4,
    motion: 0.3,
    light: 0.2,
    location: 0.1
  };

  // Temporal buffer for signal smoothing and trend analysis
  private readonly BUFFER_SIZE = 10;
  private sensorHistory: SensorData[] = [];
  private featureHistory: SensorFeatures[] = [];

  // Quality thresholds with dynamic ranges
  private readonly QUALITY_THRESHOLDS = {
    audio: { min: 5, max: 95, optimal: [20, 80] }, // Optimal range for best quality
    motion: { min: 1, max: 100, optimal: [5, 60] },
    light: { min: 10, max: 90, optimal: [30, 70] },
    location: { min: 0, max: 100, optimal: [50, 100] }
  };

  // Kalman filter parameters for sensor smoothing
  private kalmanFilters = {
    audio: { estimate: 0, errorCovariance: 1, processNoise: 0.1, measurementNoise: 1 },
    motion: { estimate: 0, errorCovariance: 1, processNoise: 0.2, measurementNoise: 1.5 },
    light: { estimate: 0, errorCovariance: 1, processNoise: 0.05, measurementNoise: 0.8 }
  };

  /**
   * Main fusion method with enhanced signal processing
   */
  fuseSensorData(sensors: SensorData): FusionResult {
    // Step 1: Apply temporal smoothing with Kalman filtering
    const smoothedSensors = this.applySensorSmoothing(sensors);
    
    // Step 2: Update sensor history buffer
    this.updateSensorHistory(smoothedSensors);
    
    // Step 3: Assess enhanced sensor quality
    const quality = this.assessEnhancedSensorQuality(smoothedSensors);
    
    // Step 4: Adaptive weight adjustment based on quality
    this.adaptSensorWeights(quality);
    
    // Step 5: Extract enhanced features
    const audioFeatures = this.extractAudioFeatures(smoothedSensors.audioLevel, quality.audio);
    const motionFeatures = this.extractMotionFeatures(smoothedSensors.movement, quality.motion);
    const lightFeatures = this.extractLightFeatures(smoothedSensors.lightLevel, quality.light);
    const locationFeatures = this.extractLocationFeatures(smoothedSensors.location, quality.location);
    
    // Step 6: Advanced feature fusion with coherence analysis
    const features = this.fuseEnhancedFeatures(
      audioFeatures,
      motionFeatures,
      lightFeatures,
      locationFeatures,
      quality
    );
    
    // Step 7: Temporal trend analysis
    const temporalTrends = this.analyzeTemporalTrends();
    
    // Step 8: Enhanced cross-validation and anomaly detection
    const { validatedFeatures, anomalyScore, signalToNoise } = this.enhancedCrossValidation(
      features,
      { audioFeatures, motionFeatures, lightFeatures, locationFeatures }
    );
    
    // Step 9: Update feature history
    this.updateFeatureHistory(validatedFeatures);
    
    // Step 10: Determine dominant factors with confidence weighting
    const dominantFactors = this.identifyDominantFactors(
      smoothedSensors,
      quality,
      validatedFeatures
    );
    
    // Step 11: Calculate environmental match with temporal context
    const environmentalMatch = this.calculateEnhancedEnvironmentalMatch(
      validatedFeatures,
      smoothedSensors,
      temporalTrends
    );
    
    return {
      features: { 
        ...validatedFeatures, 
        anomaly: anomalyScore,
        stability: this.calculateStability(),
        coherence: quality.crossCorrelation,
        confidence: quality.overall * (1 - anomalyScore * 0.3)
      },
      quality,
      dominantFactors,
      environmentalMatch,
      rawSensors: smoothedSensors,
      signalToNoise,
      temporalTrends
    };
  }

  /**
   * Apply Kalman filtering for sensor smoothing
   */
  private applySensorSmoothing(sensors: SensorData): SensorData {
    const smoothedAudio = this.kalmanFilter('audio', sensors.audioLevel);
    const smoothedMotion = this.kalmanFilter('motion', sensors.movement.intensity);
    const smoothedLight = this.kalmanFilter('light', sensors.lightLevel);

    return {
      ...sensors,
      audioLevel: smoothedAudio,
      movement: {
        ...sensors.movement,
        intensity: smoothedMotion
      },
      lightLevel: smoothedLight
    };
  }

  /**
   * Kalman filter implementation for sensor smoothing
   */
  private kalmanFilter(sensor: 'audio' | 'motion' | 'light', measurement: number): number {
    const filter = this.kalmanFilters[sensor];
    
    // Prediction step
    const predictedEstimate = filter.estimate;
    const predictedErrorCovariance = filter.errorCovariance + filter.processNoise;
    
    // Update step
    const kalmanGain = predictedErrorCovariance / (predictedErrorCovariance + filter.measurementNoise);
    filter.estimate = predictedEstimate + kalmanGain * (measurement - predictedEstimate);
    filter.errorCovariance = (1 - kalmanGain) * predictedErrorCovariance;
    
    return filter.estimate;
  }

  /**
   * Enhanced sensor quality assessment with cross-correlation
   */
  private assessEnhancedSensorQuality(sensors: SensorData): SensorQuality {
    const { audio, motion, light, location } = this.QUALITY_THRESHOLDS;
    
    // Enhanced audio quality with optimal range consideration
    const audioQuality = this.calculateOptimalRangeQuality(sensors.audioLevel, audio);
    
    // Enhanced motion quality with pattern consistency
    const motionQuality = this.calculateMotionQuality(sensors.movement);
    
    // Enhanced light quality with stability consideration
    const lightQuality = this.calculateOptimalRangeQuality(sensors.lightLevel, light);
    
    // Location quality with density context
    const locationQuality = this.calculateLocationQuality(sensors.location);
    
    // Temporal quality based on consistency over time
    const temporalQuality = this.calculateTemporalQuality();
    
    // Cross-correlation between sensors
    const crossCorrelation = this.calculateCrossCorrelation(sensors);
    
    const overall = (
      audioQuality * this.sensorWeights.audio +
      motionQuality * this.sensorWeights.motion +
      lightQuality * this.sensorWeights.light +
      locationQuality * this.sensorWeights.location
    ) * temporalQuality * crossCorrelation;
    
    return {
      overall,
      audio: audioQuality,
      motion: motionQuality,
      light: lightQuality,
      location: locationQuality,
      temporal: temporalQuality,
      crossCorrelation
    };
  }

  /**
   * Calculate quality based on optimal sensor ranges
   */
  private calculateOptimalRangeQuality(value: number, thresholds: any): number {
    const { min, max, optimal } = thresholds;
    
    if (value < min || value > max) return 0.2;
    
    if (value >= optimal[0] && value <= optimal[1]) {
      return 1.0; // Optimal range
    }
    
    // Calculate distance from optimal range
    const distanceFromOptimal = Math.min(
      Math.abs(value - optimal[0]),
      Math.abs(value - optimal[1])
    );
    
    const maxDistance = Math.max(optimal[0] - min, max - optimal[1]);
    return Math.max(0.3, 1.0 - (distanceFromOptimal / maxDistance) * 0.7);
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
   * Enhanced feature fusion with coherence analysis
   */
  private fuseEnhancedFeatures(
    audio: Partial<SensorFeatures>,
    motion: Partial<SensorFeatures>,
    light: Partial<SensorFeatures>,
    location: Partial<SensorFeatures>,
    quality: SensorQuality
  ): SensorFeatures {
    const features = ['energy', 'social', 'focus', 'mood'] as const;
    const result: any = {};
    
    features.forEach(feature => {
      const values = [
        { val: (audio[feature] || 0), weight: this.sensorWeights.audio, quality: quality.audio },
        { val: (motion[feature] || 0), weight: this.sensorWeights.motion, quality: quality.motion },
        { val: (light[feature] || 0), weight: this.sensorWeights.light, quality: quality.light },
        { val: (location[feature] || 0), weight: this.sensorWeights.location, quality: quality.location }
      ];
      
      // Quality-weighted fusion with confidence intervals
      const totalWeight = values.reduce((sum, v) => sum + (v.weight * v.quality), 0);
      const weightedSum = values.reduce((sum, v) => sum + (v.val * v.weight * v.quality), 0);
      
      result[feature] = totalWeight > 0 ? Math.min(1, weightedSum / totalWeight) : 0;
    });
    
    return result as SensorFeatures;
  }

  /**
   * Adaptive sensor weight adjustment based on quality
   */
  private adaptSensorWeights(quality: SensorQuality): void {
    const totalQuality = quality.audio + quality.motion + quality.light + quality.location;
    
    if (totalQuality > 0) {
      // Adjust weights based on relative quality, but maintain some base weighting
      const baseWeight = 0.1; // Minimum weight to maintain
      const adaptiveWeight = 0.9; // Weight available for adaptation
      
      this.sensorWeights.audio = baseWeight + (quality.audio / totalQuality) * adaptiveWeight;
      this.sensorWeights.motion = baseWeight + (quality.motion / totalQuality) * adaptiveWeight;
      this.sensorWeights.light = baseWeight + (quality.light / totalQuality) * adaptiveWeight;
      this.sensorWeights.location = baseWeight + (quality.location / totalQuality) * adaptiveWeight;
      
      // Normalize to sum to 1.0
      const sum = Object.values(this.sensorWeights).reduce((a, b) => a + b, 0);
      Object.keys(this.sensorWeights).forEach(key => {
        this.sensorWeights[key as keyof typeof this.sensorWeights] /= sum;
      });
    }
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

  /**
   * Enhanced cross-validation and anomaly detection
   */
  private enhancedCrossValidation(
    features: SensorFeatures,
    individualFeatures: any
  ): { validatedFeatures: SensorFeatures; anomalyScore: number; signalToNoise: number } {
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

    // Signal-to-noise ratio calculation (example)
    const signalToNoise = 0.8; // Placeholder, actual calculation would involve sensor history
    
    return { validatedFeatures: validated, anomalyScore: Math.min(1, anomalyScore), signalToNoise };
  }

  /**
   * Temporal trend analysis
   */
  private analyzeTemporalTrends(): {
    energy: 'increasing' | 'decreasing' | 'stable';
    social: 'increasing' | 'decreasing' | 'stable';
    stability: number;
  } {
    const history = this.featureHistory;
    if (history.length < 2) {
      return { energy: 'stable', social: 'stable', stability: 0.5 };
    }

    const last = history[history.length - 1];
    const secondLast = history[history.length - 2];

    const energyTrend = this.calculateTrend(last.energy, secondLast.energy);
    const socialTrend = this.calculateTrend(last.social, secondLast.social);

    // Simple stability calculation (e.g., how much energy changes)
    const stability = Math.abs(last.energy - secondLast.energy) < 0.1 ? 1.0 : 0.5;

    return {
      energy: energyTrend,
      social: socialTrend,
      stability: stability
    };
  }

  /**
   * Calculate trend (increasing, decreasing, stable)
   */
  private calculateTrend(current: number, previous: number): 'increasing' | 'decreasing' | 'stable' {
    if (current > previous) {
      return 'increasing';
    } else if (current < previous) {
      return 'decreasing';
    } else {
      return 'stable';
    }
  }

  /**
   * Update sensor history buffer
   */
  private updateSensorHistory(sensors: SensorData): void {
    this.sensorHistory.push(sensors);
    if (this.sensorHistory.length > this.BUFFER_SIZE) {
      this.sensorHistory.shift();
    }
  }

  /**
   * Update feature history buffer
   */
  private updateFeatureHistory(features: SensorFeatures): void {
    this.featureHistory.push(features);
    if (this.featureHistory.length > this.BUFFER_SIZE) {
      this.featureHistory.shift();
    }
  }

  /**
   * Calculate overall stability of the sensor fusion system
   */
  private calculateStability(): number {
    const history = this.featureHistory;
    if (history.length < 2) {
      return 0.5;
    }

    let stabilitySum = 0;
    for (let i = 1; i < history.length; i++) {
      const current = history[i];
      const previous = history[i - 1];
      stabilitySum += Math.abs(current.energy - previous.energy);
    }
    return history.length > 1 ? stabilitySum / (history.length - 1) : 0.5;
  }

  /**
   * Calculate temporal consistency quality
   */
  private calculateTemporalQuality(): number {
    const history = this.featureHistory;
    if (history.length < 2) {
      return 0.5;
    }

    let consistencySum = 0;
    for (let i = 1; i < history.length; i++) {
      const current = history[i];
      const previous = history[i - 1];
      consistencySum += Math.abs(current.energy - previous.energy);
    }
    return history.length > 1 ? 1 - (consistencySum / (history.length - 1)) : 0.5;
  }

  /**
   * Calculate cross-correlation between sensors
   */
  private calculateCrossCorrelation(sensors: SensorData): number {
    const history = this.sensorHistory;
    if (history.length < 2) {
      return 0.5;
    }

    let sumProduct = 0;
    let sumAudio = 0;
    let sumMotion = 0;
    let sumLight = 0;
    let sumLocation = 0;

    for (const s of history) {
      sumProduct += s.audioLevel * s.movement.intensity * s.lightLevel;
      sumAudio += s.audioLevel;
      sumMotion += s.movement.intensity;
      sumLight += s.lightLevel;
      sumLocation += s.location.context === 'venue' ? 1 : 0; // Simplified for context
    }

    const n = history.length;
    const meanAudio = sumAudio / n;
    const meanMotion = sumMotion / n;
    const meanLight = sumLight / n;
    const meanLocation = sumLocation / n;

    let numerator = 0;
    let denominatorAudio = 0;
    let denominatorMotion = 0;
    let denominatorLight = 0;
    let denominatorLocation = 0;

    for (const s of history) {
      numerator += (s.audioLevel - meanAudio) * (s.movement.intensity - meanMotion);
      denominatorAudio += Math.pow(s.audioLevel - meanAudio, 2);
      denominatorMotion += Math.pow(s.movement.intensity - meanMotion, 2);
      denominatorLight += Math.pow(s.lightLevel - meanLight, 2);
      denominatorLocation += Math.pow(s.location.context === 'venue' ? 1 : 0 - meanLocation, 2);
    }

    const correlationAudio = denominatorAudio > 0 ? numerator / Math.sqrt(denominatorAudio * denominatorMotion) : 0;
    const correlationMotion = denominatorMotion > 0 ? numerator / Math.sqrt(denominatorAudio * denominatorMotion) : 0;
    const correlationLight = denominatorLight > 0 ? numerator / Math.sqrt(denominatorAudio * denominatorLight) : 0;
    const correlationLocation = denominatorLocation > 0 ? numerator / Math.sqrt(denominatorAudio * denominatorLocation) : 0;

    return (correlationAudio + correlationMotion + correlationLight + correlationLocation) / 4;
  }

  /**
   * Calculate motion quality based on pattern consistency
   */
  private calculateMotionQuality(movement: SensorData['movement']): number {
    const history = this.sensorHistory;
    if (history.length < 2) {
      return 0.5;
    }

    let sumPatternConsistency = 0;
    for (let i = 1; i < history.length; i++) {
      const current = history[i];
      const previous = history[i - 1];
      sumPatternConsistency += this.calculatePatternConsistency(current.movement, previous.movement);
    }
    return history.length > 1 ? 1 - (sumPatternConsistency / (history.length - 1)) : 0.5;
  }

  /**
   * Calculate pattern consistency between two movement patterns
   */
  private calculatePatternConsistency(current: SensorData['movement'], previous: SensorData['movement']): number {
    const currentPattern = {
      still: 0,
      walking: 0.4,
      active: 0.7,
      dancing: 1.0
    }[current.pattern];

    const previousPattern = {
      still: 0,
      walking: 0.4,
      active: 0.7,
      dancing: 1.0
    }[previous.pattern];

    return Math.abs(currentPattern - previousPattern);
  }

  /**
   * Calculate location quality based on context certainty
   */
  private calculateLocationQuality(location: SensorData['location']): number {
    const history = this.sensorHistory;
    if (history.length < 2) {
      return 0.5;
    }

    let sumContextCertainty = 0;
    for (let i = 1; i < history.length; i++) {
      const current = history[i];
      const previous = history[i - 1];
      sumContextCertainty += this.calculateContextCertainty(current.location, previous.location);
    }
    return history.length > 1 ? 1 - (sumContextCertainty / (history.length - 1)) : 0.5;
  }

  /**
   * Calculate context certainty between two locations
   */
  private calculateContextCertainty(current: SensorData['location'], previous: SensorData['location']): number {
    const currentContext = current.context;
    const previousContext = previous.context;

    if (currentContext === 'unknown' || previousContext === 'unknown') {
      return 0.1; // Low certainty if context is unknown
    }

    const contextWeights = {
      venue: { social: 0.8, energy: 0.6, mood: 0.7, focus: 0.2 },
      outdoor: { energy: 0.6, mood: 0.8, focus: 0.3, social: 0.4 },
      indoor: { focus: 0.7, social: 0.4, energy: 0.3, mood: 0.4 },
      transport: { focus: 0.5, energy: 0.3, social: 0.2, mood: 0.3 },
      unknown: { energy: 0.1, social: 0.1, focus: 0.1, mood: 0.1 }
    };

    const weights = contextWeights[currentContext] || contextWeights.unknown;
    const weightsPrevious = contextWeights[previousContext] || contextWeights.unknown;

    return Math.abs(weights.energy - weightsPrevious.energy) +
           Math.abs(weights.social - weightsPrevious.social) +
           Math.abs(weights.mood - weightsPrevious.mood) +
           Math.abs(weights.focus - weightsPrevious.focus);
  }

  /**
   * Calculate environmental match with temporal context
   */
  private calculateEnhancedEnvironmentalMatch(
    features: SensorFeatures,
    sensors: SensorData,
    temporalTrends: {
      energy: 'increasing' | 'decreasing' | 'stable';
      social: 'increasing' | 'decreasing' | 'stable';
      stability: number;
    }
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

    // Temporal context influence
    if (temporalTrends.energy === 'increasing' && features.energy > 0.7) {
      match += 0.1;
    } else if (temporalTrends.energy === 'decreasing' && features.energy < 0.3) {
      match += 0.1;
    }

    if (temporalTrends.social === 'increasing' && features.social > 0.7) {
      match += 0.1;
    } else if (temporalTrends.social === 'decreasing' && features.social < 0.3) {
      match += 0.1;
    }

    if (temporalTrends.stability > 0.7 && features.stability > 0.7) {
      match += 0.1;
    }
    
    return Math.max(0, Math.min(1, match));
  }
}