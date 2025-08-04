import type { Vibe } from '@/types/vibes';
import type { VibeAnalysisResult } from './VibeAnalysisEngine';

export interface AccuracyMetrics {
  // Basic accuracy metrics
  overallAccuracy: number; // 0-1
  precisionByVibe: Partial<Record<Vibe, number>>;
  recallByVibe: Partial<Record<Vibe, number>>;
  f1ScoreByVibe: Partial<Record<Vibe, number>>;
  
  // Advanced metrics
  macroF1: number; // Average F1 across all vibes
  microF1: number; // Overall F1 considering all predictions
  weightedF1: number; // F1 weighted by support
  
  // Confidence calibration
  calibrationError: number; // How well confidence matches accuracy
  reliabilityDiagram: Array<{ confidenceBin: number; accuracy: number; count: number }>;
  
  // Temporal metrics
  accuracyTrend: Array<{ timestamp: Date; accuracy: number }>;
  learningCurve: Array<{ sampleCount: number; accuracy: number }>;
  
  // Context-specific metrics
  accuracyByContext: Record<string, number>;
  accuracyByTimeOfDay: Record<string, number>;
  accuracyByUserType: Record<string, number>;
  
  // Prediction quality
  uncertaintyCalibration: number; // How well uncertainty estimates match error rates
  predictionInterval95Coverage: number; // Coverage of 95% prediction intervals
  
  // System performance
  responseTime: { mean: number; p95: number; p99: number };
  throughput: number; // Predictions per second
  errorRate: number; // System error rate
}

export interface ValidationResult {
  isValid: boolean;
  confidence: number;
  issues: Array<{
    type: 'accuracy' | 'calibration' | 'bias' | 'performance';
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    recommendation: string;
  }>;
  overallScore: number; // 0-100 system health score
}

export interface PredictionRecord {
  id: string;
  timestamp: Date;
  sensorData: any;
  context: any;
  prediction: {
    vibe: Vibe;
    confidence: number;
    alternatives: Array<{ vibe: Vibe; confidence: number }>;
    uncertaintyEstimate?: number;
    predictionInterval?: { lower: number; upper: number };
  };
  groundTruth?: {
    vibe: Vibe;
    confidence: number;
    source: 'user_correction' | 'expert_label' | 'crowdsource';
    delay: number; // Time between prediction and ground truth (ms)
  };
  outcome?: {
    correct: boolean;
    confidenceError: number;
    calibrationBin: number;
  };
  metadata: {
    userId?: string;
    sessionId?: string;
    contextType: string;
    modelVersion: string;
    featureVersion: string;
  };
}

/**
 * Comprehensive Accuracy Measurement and Validation System
 * 
 * Provides real-time monitoring, validation, and optimization of vibe detection accuracy
 * with advanced statistical analysis and automated quality assurance.
 */
export class AccuracyMeasurementSystem {
  private predictions: Map<string, PredictionRecord> = new Map();
  private readonly MAX_PREDICTIONS = 10000; // Rolling window size
  private readonly CALIBRATION_BINS = 10;
  
  // Performance tracking
  private responseTimeBuffer: number[] = [];
  private readonly PERF_BUFFER_SIZE = 1000;
  
  // A/B testing support
  private experimentGroups: Map<string, string> = new Map(); // userId -> experimentGroup
  
  /**
   * Record a new prediction for accuracy tracking
   */
  recordPrediction(
    predictionId: string,
    sensorData: any,
    context: any,
    result: VibeAnalysisResult,
    metadata: Partial<PredictionRecord['metadata']> = {}
  ): void {
    const record: PredictionRecord = {
      id: predictionId,
      timestamp: new Date(),
      sensorData,
      context,
      prediction: {
        vibe: result.suggestedVibe,
        confidence: result.confidence,
        alternatives: result.alternatives,
        uncertaintyEstimate: result.mlAnalysis?.uncertaintyEstimate,
        predictionInterval: result.mlAnalysis?.predictionInterval
      },
      metadata: {
        contextType: this.inferContextType(context),
        modelVersion: 'v2.0', // Would be dynamically set
        featureVersion: 'enhanced',
        ...metadata
      }
    };
    
    this.predictions.set(predictionId, record);
    this.maintainPredictionBuffer();
  }
  
  /**
   * Record ground truth for a prediction
   */
  recordGroundTruth(
    predictionId: string,
    groundTruth: PredictionRecord['groundTruth']
  ): void {
    const record = this.predictions.get(predictionId);
    if (!record) return;
    
    record.groundTruth = groundTruth;
    record.outcome = this.calculateOutcome(record);
    
    this.predictions.set(predictionId, record);
  }
  
  /**
   * Calculate comprehensive accuracy metrics
   */
  calculateAccuracyMetrics(timeWindow?: { start: Date; end: Date }): AccuracyMetrics {
    const records = this.getFilteredRecords(timeWindow);
    const validRecords = records.filter(r => r.groundTruth && r.outcome);
    
    if (validRecords.length === 0) {
      return this.getDefaultMetrics();
    }
    
    // Basic accuracy metrics
    const overallAccuracy = this.calculateOverallAccuracy(validRecords);
    const precisionByVibe = this.calculatePrecisionByVibe(validRecords);
    const recallByVibe = this.calculateRecallByVibe(validRecords);
    const f1ScoreByVibe = this.calculateF1ScoreByVibe(precisionByVibe, recallByVibe);
    
    // Advanced metrics
    const macroF1 = this.calculateMacroF1(f1ScoreByVibe);
    const microF1 = this.calculateMicroF1(validRecords);
    const weightedF1 = this.calculateWeightedF1(validRecords, f1ScoreByVibe);
    
    // Confidence calibration
    const calibrationError = this.calculateCalibrationError(validRecords);
    const reliabilityDiagram = this.generateReliabilityDiagram(validRecords);
    
    // Temporal metrics
    const accuracyTrend = this.calculateAccuracyTrend(validRecords);
    const learningCurve = this.calculateLearningCurve(validRecords);
    
    // Context-specific metrics
    const accuracyByContext = this.calculateAccuracyByContext(validRecords);
    const accuracyByTimeOfDay = this.calculateAccuracyByTimeOfDay(validRecords);
    const accuracyByUserType = this.calculateAccuracyByUserType(validRecords);
    
    // Prediction quality
    const uncertaintyCalibration = this.calculateUncertaintyCalibration(validRecords);
    const predictionInterval95Coverage = this.calculatePredictionIntervalCoverage(validRecords);
    
    // Performance metrics
    const responseTime = this.calculateResponseTimeMetrics();
    const throughput = this.calculateThroughput(records);
    const errorRate = this.calculateErrorRate(records);
    
    return {
      overallAccuracy,
      precisionByVibe,
      recallByVibe,
      f1ScoreByVibe,
      macroF1,
      microF1,
      weightedF1,
      calibrationError,
      reliabilityDiagram,
      accuracyTrend,
      learningCurve,
      accuracyByContext,
      accuracyByTimeOfDay,
      accuracyByUserType,
      uncertaintyCalibration,
      predictionInterval95Coverage,
      responseTime,
      throughput,
      errorRate
    };
  }
  
  /**
   * Validate system performance and identify issues
   */
  validateSystem(metrics?: AccuracyMetrics): ValidationResult {
    const currentMetrics = metrics || this.calculateAccuracyMetrics();
    const issues: ValidationResult['issues'] = [];
    
    // Accuracy validation
    if (currentMetrics.overallAccuracy < 0.6) {
      issues.push({
        type: 'accuracy',
        severity: 'critical',
        description: `Overall accuracy is ${(currentMetrics.overallAccuracy * 100).toFixed(1)}%, below minimum threshold of 60%`,
        recommendation: 'Review model parameters, increase training data, or retrain model'
      });
    } else if (currentMetrics.overallAccuracy < 0.75) {
      issues.push({
        type: 'accuracy',
        severity: 'medium',
        description: `Overall accuracy is ${(currentMetrics.overallAccuracy * 100).toFixed(1)}%, below target of 75%`,
        recommendation: 'Consider model improvements or additional feature engineering'
      });
    }
    
    // Calibration validation
    if (currentMetrics.calibrationError > 0.1) {
      issues.push({
        type: 'calibration',
        severity: 'high',
        description: `Confidence calibration error is ${(currentMetrics.calibrationError * 100).toFixed(1)}%`,
        recommendation: 'Implement confidence calibration techniques like Platt scaling'
      });
    }
    
    // Bias detection
    const biasIssues = this.detectBias(currentMetrics);
    issues.push(...biasIssues);
    
    // Performance validation
    if (currentMetrics.responseTime.p95 > 1000) { // 1 second
      issues.push({
        type: 'performance',
        severity: 'medium',
        description: `95th percentile response time is ${currentMetrics.responseTime.p95}ms`,
        recommendation: 'Optimize model inference or consider model compression'
      });
    }
    
    if (currentMetrics.errorRate > 0.01) { // 1%
      issues.push({
        type: 'performance',
        severity: 'high',
        description: `System error rate is ${(currentMetrics.errorRate * 100).toFixed(2)}%`,
        recommendation: 'Investigate and fix system errors'
      });
    }
    
    // Calculate overall score
    const overallScore = this.calculateOverallScore(currentMetrics, issues);
    
    return {
      isValid: issues.filter(i => i.severity === 'critical').length === 0,
      confidence: Math.min(1, currentMetrics.overallAccuracy + (1 - currentMetrics.calibrationError)),
      issues,
      overallScore
    };
  }
  
  /**
   * Generate A/B test report comparing different model versions
   */
  generateABTestReport(
    controlGroup: string,
    treatmentGroup: string,
    timeWindow?: { start: Date; end: Date }
  ): {
    controlMetrics: AccuracyMetrics;
    treatmentMetrics: AccuracyMetrics;
    statisticalSignificance: {
      pValue: number;
      isSignificant: boolean;
      confidenceInterval: { lower: number; upper: number };
    };
    recommendation: string;
  } {
    const controlRecords = this.getRecordsByExperimentGroup(controlGroup, timeWindow);
    const treatmentRecords = this.getRecordsByExperimentGroup(treatmentGroup, timeWindow);
    
    const controlMetrics = this.calculateMetricsForRecords(controlRecords);
    const treatmentMetrics = this.calculateMetricsForRecords(treatmentRecords);
    
    const statisticalSignificance = this.calculateStatisticalSignificance(
      controlRecords,
      treatmentRecords
    );
    
    const recommendation = this.generateABTestRecommendation(
      controlMetrics,
      treatmentMetrics,
      statisticalSignificance
    );
    
    return {
      controlMetrics,
      treatmentMetrics,
      statisticalSignificance,
      recommendation
    };
  }
  
  /**
   * Record response time for performance tracking
   */
  recordResponseTime(responseTime: number): void {
    this.responseTimeBuffer.push(responseTime);
    if (this.responseTimeBuffer.length > this.PERF_BUFFER_SIZE) {
      this.responseTimeBuffer.shift();
    }
  }
  
  /**
   * Assign user to experiment group for A/B testing
   */
  assignToExperimentGroup(userId: string, group: string): void {
    this.experimentGroups.set(userId, group);
  }
  
  // Private helper methods
  
  private maintainPredictionBuffer(): void {
    if (this.predictions.size > this.MAX_PREDICTIONS) {
      const oldestKey = this.predictions.keys().next().value;
      this.predictions.delete(oldestKey);
    }
  }
  
  private calculateOutcome(record: PredictionRecord): PredictionRecord['outcome'] {
    if (!record.groundTruth) return undefined;
    
    const correct = record.prediction.vibe === record.groundTruth.vibe;
    const confidenceError = Math.abs(record.prediction.confidence - (correct ? 1 : 0));
    const calibrationBin = Math.floor(record.prediction.confidence * this.CALIBRATION_BINS);
    
    return {
      correct,
      confidenceError,
      calibrationBin
    };
  }
  
  private calculateOverallAccuracy(records: PredictionRecord[]): number {
    const correctPredictions = records.filter(r => r.outcome?.correct).length;
    return correctPredictions / records.length;
  }
  
  private calculatePrecisionByVibe(records: PredictionRecord[]): Partial<Record<Vibe, number>> {
    const precision: Partial<Record<Vibe, number>> = {};
    const vibes = this.getUniqueVibes(records);
    
    vibes.forEach(vibe => {
      const predicted = records.filter(r => r.prediction.vibe === vibe);
      const truePositives = predicted.filter(r => r.groundTruth?.vibe === vibe).length;
      
      precision[vibe] = predicted.length > 0 ? truePositives / predicted.length : 0;
    });
    
    return precision;
  }
  
  private calculateRecallByVibe(records: PredictionRecord[]): Partial<Record<Vibe, number>> {
    const recall: Partial<Record<Vibe, number>> = {};
    const vibes = this.getUniqueVibes(records);
    
    vibes.forEach(vibe => {
      const actual = records.filter(r => r.groundTruth?.vibe === vibe);
      const truePositives = actual.filter(r => r.prediction.vibe === vibe).length;
      
      recall[vibe] = actual.length > 0 ? truePositives / actual.length : 0;
    });
    
    return recall;
  }
  
  private calculateF1ScoreByVibe(
    precision: Partial<Record<Vibe, number>>,
    recall: Partial<Record<Vibe, number>>
  ): Partial<Record<Vibe, number>> {
    const f1Score: Partial<Record<Vibe, number>> = {};
    
    Object.keys(precision).forEach(vibe => {
      const p = precision[vibe as Vibe] || 0;
      const r = recall[vibe as Vibe] || 0;
      
      f1Score[vibe as Vibe] = (p + r) > 0 ? (2 * p * r) / (p + r) : 0;
    });
    
    return f1Score;
  }
  
  private calculateMacroF1(f1Scores: Partial<Record<Vibe, number>>): number {
    const scores = Object.values(f1Scores).filter(score => score !== undefined) as number[];
    return scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
  }
  
  private calculateMicroF1(records: PredictionRecord[]): number {
    // For multiclass, micro F1 equals accuracy
    return this.calculateOverallAccuracy(records);
  }
  
  private calculateWeightedF1(
    records: PredictionRecord[],
    f1Scores: Partial<Record<Vibe, number>>
  ): number {
    const vibes = this.getUniqueVibes(records);
    let weightedSum = 0;
    let totalSupport = 0;
    
    vibes.forEach(vibe => {
      const support = records.filter(r => r.groundTruth?.vibe === vibe).length;
      const f1 = f1Scores[vibe] || 0;
      
      weightedSum += f1 * support;
      totalSupport += support;
    });
    
    return totalSupport > 0 ? weightedSum / totalSupport : 0;
  }
  
  private calculateCalibrationError(records: PredictionRecord[]): number {
    const bins: Array<{ confidence: number; accuracy: number; count: number }> = [];
    
    for (let i = 0; i < this.CALIBRATION_BINS; i++) {
      const binRecords = records.filter(r => 
        Math.floor((r.prediction.confidence || 0) * this.CALIBRATION_BINS) === i
      );
      
      if (binRecords.length > 0) {
        const binAccuracy = binRecords.filter(r => r.outcome?.correct).length / binRecords.length;
        const binConfidence = (i + 0.5) / this.CALIBRATION_BINS;
        
        bins.push({
          confidence: binConfidence,
          accuracy: binAccuracy,
          count: binRecords.length
        });
      }
    }
    
    // Calculate Expected Calibration Error (ECE)
    let ece = 0;
    const totalSamples = records.length;
    
    bins.forEach(bin => {
      const weight = bin.count / totalSamples;
      ece += weight * Math.abs(bin.confidence - bin.accuracy);
    });
    
    return ece;
  }
  
  private generateReliabilityDiagram(records: PredictionRecord[]): AccuracyMetrics['reliabilityDiagram'] {
    const diagram: AccuracyMetrics['reliabilityDiagram'] = [];
    
    for (let i = 0; i < this.CALIBRATION_BINS; i++) {
      const binRecords = records.filter(r => 
        Math.floor((r.prediction.confidence || 0) * this.CALIBRATION_BINS) === i
      );
      
      if (binRecords.length > 0) {
        const accuracy = binRecords.filter(r => r.outcome?.correct).length / binRecords.length;
        const confidenceBin = (i + 0.5) / this.CALIBRATION_BINS;
        
        diagram.push({
          confidenceBin,
          accuracy,
          count: binRecords.length
        });
      }
    }
    
    return diagram;
  }
  
  private getUniqueVibes(records: PredictionRecord[]): Vibe[] {
    const vibes = new Set<Vibe>();
    records.forEach(r => {
      vibes.add(r.prediction.vibe);
      if (r.groundTruth?.vibe) vibes.add(r.groundTruth.vibe);
    });
    return Array.from(vibes);
  }
  
  private getFilteredRecords(timeWindow?: { start: Date; end: Date }): PredictionRecord[] {
    const records = Array.from(this.predictions.values());
    
    if (!timeWindow) return records;
    
    return records.filter(r => 
      r.timestamp >= timeWindow.start && r.timestamp <= timeWindow.end
    );
  }
  
  private getDefaultMetrics(): AccuracyMetrics {
    return {
      overallAccuracy: 0,
      precisionByVibe: {},
      recallByVibe: {},
      f1ScoreByVibe: {},
      macroF1: 0,
      microF1: 0,
      weightedF1: 0,
      calibrationError: 0,
      reliabilityDiagram: [],
      accuracyTrend: [],
      learningCurve: [],
      accuracyByContext: {},
      accuracyByTimeOfDay: {},
      accuracyByUserType: {},
      uncertaintyCalibration: 0,
      predictionInterval95Coverage: 0,
      responseTime: { mean: 0, p95: 0, p99: 0 },
      throughput: 0,
      errorRate: 0
    };
  }
  
  private inferContextType(context: any): string {
    // Simple context type inference - would be more sophisticated in practice
    if (context.location?.context) return context.location.context;
    if (context.timeOfDay) return context.timeOfDay;
    return 'unknown';
  }
  
  // Additional helper methods would be implemented here...
  private calculateAccuracyTrend(records: PredictionRecord[]): Array<{ timestamp: Date; accuracy: number }> {
    // Implementation for temporal accuracy trend
    return [];
  }
  
  private calculateLearningCurve(records: PredictionRecord[]): Array<{ sampleCount: number; accuracy: number }> {
    // Implementation for learning curve analysis
    return [];
  }
  
  private calculateAccuracyByContext(records: PredictionRecord[]): Record<string, number> {
    // Implementation for context-specific accuracy
    return {};
  }
  
  private calculateAccuracyByTimeOfDay(records: PredictionRecord[]): Record<string, number> {
    // Implementation for time-based accuracy analysis
    return {};
  }
  
  private calculateAccuracyByUserType(records: PredictionRecord[]): Record<string, number> {
    // Implementation for user-type-specific accuracy
    return {};
  }
  
  private calculateUncertaintyCalibration(records: PredictionRecord[]): number {
    // Implementation for uncertainty calibration
    return 0.5;
  }
  
  private calculatePredictionIntervalCoverage(records: PredictionRecord[]): number {
    // Implementation for prediction interval coverage
    return 0.95;
  }
  
  private calculateResponseTimeMetrics(): { mean: number; p95: number; p99: number } {
    if (this.responseTimeBuffer.length === 0) {
      return { mean: 0, p95: 0, p99: 0 };
    }
    
    const sorted = [...this.responseTimeBuffer].sort((a, b) => a - b);
    const mean = sorted.reduce((sum, time) => sum + time, 0) / sorted.length;
    const p95Index = Math.floor(sorted.length * 0.95);
    const p99Index = Math.floor(sorted.length * 0.99);
    
    return {
      mean,
      p95: sorted[p95Index] || 0,
      p99: sorted[p99Index] || 0
    };
  }
  
  private calculateThroughput(records: PredictionRecord[]): number {
    if (records.length === 0) return 0;
    
    const timeSpan = records[records.length - 1].timestamp.getTime() - records[0].timestamp.getTime();
    return timeSpan > 0 ? (records.length / timeSpan) * 1000 : 0; // predictions per second
  }
  
  private calculateErrorRate(records: PredictionRecord[]): number {
    // This would track system errors, not prediction errors
    return 0; // Placeholder
  }
  
  private detectBias(metrics: AccuracyMetrics): ValidationResult['issues'] {
    const issues: ValidationResult['issues'] = [];
    
    // Check for vibe-specific bias
    Object.entries(metrics.f1ScoreByVibe).forEach(([vibe, f1]) => {
      if (f1 !== undefined && f1 < 0.3) {
        issues.push({
          type: 'bias',
          severity: 'medium',
          description: `Poor performance on ${vibe} vibe (F1: ${(f1 * 100).toFixed(1)}%)`,
          recommendation: `Collect more training data for ${vibe} or adjust class weights`
        });
      }
    });
    
    return issues;
  }
  
  private calculateOverallScore(metrics: AccuracyMetrics, issues: ValidationResult['issues']): number {
    let score = 100;
    
    // Deduct points for accuracy
    score -= (1 - metrics.overallAccuracy) * 40;
    
    // Deduct points for calibration
    score -= metrics.calibrationError * 20;
    
    // Deduct points for issues
    issues.forEach(issue => {
      switch (issue.severity) {
        case 'critical': score -= 25; break;
        case 'high': score -= 15; break;
        case 'medium': score -= 10; break;
        case 'low': score -= 5; break;
      }
    });
    
    return Math.max(0, Math.min(100, score));
  }
  
  private getRecordsByExperimentGroup(
    group: string,
    timeWindow?: { start: Date; end: Date }
  ): PredictionRecord[] {
    const records = this.getFilteredRecords(timeWindow);
    return records.filter(r => 
      r.metadata.userId && this.experimentGroups.get(r.metadata.userId) === group
    );
  }
  
  private calculateMetricsForRecords(records: PredictionRecord[]): AccuracyMetrics {
    const validRecords = records.filter(r => r.groundTruth && r.outcome);
    
    if (validRecords.length === 0) {
      return this.getDefaultMetrics();
    }
    
    // Calculate basic metrics for the specific record set
    const overallAccuracy = this.calculateOverallAccuracy(validRecords);
    const precisionByVibe = this.calculatePrecisionByVibe(validRecords);
    const recallByVibe = this.calculateRecallByVibe(validRecords);
    const f1ScoreByVibe = this.calculateF1ScoreByVibe(precisionByVibe, recallByVibe);
    
    return {
      ...this.getDefaultMetrics(),
      overallAccuracy,
      precisionByVibe,
      recallByVibe,
      f1ScoreByVibe,
      macroF1: this.calculateMacroF1(f1ScoreByVibe),
      microF1: this.calculateMicroF1(validRecords),
      weightedF1: this.calculateWeightedF1(validRecords, f1ScoreByVibe)
    };
  }
  
  private calculateStatisticalSignificance(
    controlRecords: PredictionRecord[],
    treatmentRecords: PredictionRecord[]
  ): {
    pValue: number;
    isSignificant: boolean;
    confidenceInterval: { lower: number; upper: number };
  } {
    // Simplified statistical test - would use proper statistical methods in practice
    const controlAccuracy = this.calculateOverallAccuracy(controlRecords.filter(r => r.groundTruth));
    const treatmentAccuracy = this.calculateOverallAccuracy(treatmentRecords.filter(r => r.groundTruth));
    
    const difference = treatmentAccuracy - controlAccuracy;
    const standardError = Math.sqrt(
      (controlAccuracy * (1 - controlAccuracy)) / controlRecords.length +
      (treatmentAccuracy * (1 - treatmentAccuracy)) / treatmentRecords.length
    );
    
    const zScore = difference / standardError;
    const pValue = 2 * (1 - this.normalCDF(Math.abs(zScore))); // Two-tailed test
    
    return {
      pValue,
      isSignificant: pValue < 0.05,
      confidenceInterval: {
        lower: difference - 1.96 * standardError,
        upper: difference + 1.96 * standardError
      }
    };
  }
  
  private normalCDF(x: number): number {
    // Approximation of normal CDF
    return 0.5 * (1 + this.erf(x / Math.sqrt(2)));
  }
  
  private erf(x: number): number {
    // Approximation of error function
    const a1 =  0.254829592;
    const a2 = -0.284496736;
    const a3 =  1.421413741;
    const a4 = -1.453152027;
    const a5 =  1.061405429;
    const p  =  0.3275911;
    
    const sign = x >= 0 ? 1 : -1;
    x = Math.abs(x);
    
    const t = 1.0 / (1.0 + p * x);
    const y = 1.0 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
    
    return sign * y;
  }
  
  private generateABTestRecommendation(
    controlMetrics: AccuracyMetrics,
    treatmentMetrics: AccuracyMetrics,
    significance: { pValue: number; isSignificant: boolean }
  ): string {
    if (!significance.isSignificant) {
      return "No statistically significant difference detected. Continue testing or increase sample size.";
    }
    
    const accuracyDiff = treatmentMetrics.overallAccuracy - controlMetrics.overallAccuracy;
    
    if (accuracyDiff > 0.02) { // 2% improvement
      return "Treatment shows significant improvement. Recommend rolling out to all users.";
    } else if (accuracyDiff < -0.02) { // 2% degradation
      return "Treatment shows significant degradation. Recommend reverting to control.";
    } else {
      return "Statistically significant but practically small difference. Consider business impact.";
    }
  }
}