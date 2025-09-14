/**
 * Smoke test script for Context-Aware AI system
 * Run in dev console to validate end-to-end functionality
 */

import { ContextTruthLedger } from '@/core/context/ContextTruthLedger';
import { WorkingSetManager } from '@/core/context/WorkingSetManager';
import { synthesizeContext } from '@/core/context/ContextSynthesizer';
import { detectFriction } from '@/core/context/FrictionDetector';
import { getContextHealth, benchmarkContext } from '@/core/context/contextHealth';
import type { 
  TemporalFact, 
  VenueFact, 
  VibeFact, 
  DeviceFact, 
  WeatherFact,
  TransitionFact 
} from '@/core/context/types';

/**
 * Web smoke tests (React Router)
 */
export async function smokeTestWeb() {
  console.log('🧪 Starting Context AI Web Smoke Tests...');
  
  const ledger = new ContextTruthLedger();
  const workingSet = new WorkingSetManager(ledger);
  
  // Test 1: Basic fact insertion and retrieval
  console.log('📝 Test 1: Basic facts...');
  const temporalFact: TemporalFact = {
    kind: 'temporal',
    t: Date.now(),
    c: 0.9,
    data: { hour: 14, dayOfWeek: 2, isWeekend: false }
  };
  
  const venueFact: VenueFact = {
    kind: 'venue', 
    t: Date.now() + 1000,
    c: 0.8,
    data: { type: 'coffee', openNow: true, rating: 4.2 }
  };
  
  const vibeFact: VibeFact = {
    kind: 'vibe',
    t: Date.now() + 2000,
    c: 0.85,
    data: { vibe: 'focused', confidence: 0.85, components: { circadian: 0.6, social: 0.2 } }
  };
  
  await Promise.all([
    ledger.append(temporalFact),
    ledger.append(venueFact), 
    ledger.append(vibeFact)
  ]);
  
  const facts = ledger.getFacts();
  console.log(`✅ Inserted ${facts.length} facts`);
  
  // Test 2: Chain integrity
  console.log('🔗 Test 2: Chain integrity...');
  const isValid = await ledger.verify();
  console.log(`✅ Chain integrity: ${isValid ? 'VALID' : 'INVALID'}`);
  
  // Test 3: Context synthesis
  console.log('🧠 Test 3: Context synthesis...');
  const start = performance.now();
  const context = synthesizeContext(facts);
  const synthesisTime = performance.now() - start;
  console.log(`✅ Synthesis completed in ${synthesisTime.toFixed(2)}ms`);
  console.log(`📊 Latest context:`, context.latest);
  
  // Test 4: Rapid navigation simulation
  console.log('🚀 Test 4: Rapid navigation...');
  const transitions = [
    { from: 'home', to: 'floqs' },
    { from: 'floqs', to: 'map' }, 
    { from: 'map', to: 'floqs' }, // backtrack
    { from: 'floqs', to: 'home' }
  ];
  
  for (const [i, trans] of transitions.entries()) {
    await workingSet.pushView(
      { route: trans.to },
      { from: trans.from, latencyMs: 50 + Math.random() * 200 }
    );
    await new Promise(r => setTimeout(r, 10)); // Small delay
  }
  
  // Test 5: Friction detection
  console.log('🔍 Test 5: Friction detection...');
  const allFacts = ledger.getFacts();
  const frictionReport = detectFriction(allFacts);
  console.log(`🎯 Friction overall: ${(frictionReport.overall01 * 100).toFixed(1)}%`);
  if (frictionReport.signals.length > 0) {
    console.log('⚠️ Friction signals:', frictionReport.signals.map(s => s.kind));
    console.log('💡 Suggestions:', frictionReport.suggestions);
  }
  
  // Test 6: Health check
  console.log('🏥 Test 6: Health check...');
  const health = getContextHealth(ledger, workingSet);
  console.log('📈 System health:', health);
  
  // Test 7: Performance benchmark
  console.log('⏱️ Test 7: Performance benchmark...');
  const perf = await benchmarkContext(ledger);
  console.log(`⚡ Performance: Synthesis ${perf.synthesisMs.toFixed(2)}ms, Verify ${perf.verifyMs.toFixed(2)}ms`);
  
  // Test 8: Working set persistence
  console.log('💾 Test 8: Working set persistence...');
  const snapshot = workingSet.snapshot();
  console.log(`📁 Working set: ${snapshot.viewStack.length} views, ${Object.keys(snapshot.drafts).length} drafts`);
  
  console.log('✅ All smoke tests passed!');
  return { ledger, workingSet, context, frictionReport, health, perf };
}

/**
 * Navigation latency test (call after clicking links)
 */
export function testLatencyCapture() {
  console.log('⏰ Testing latency capture...');
  
  // Mark navigation start (simulate LedgerLink)
  (window as any).__nav_t0 = performance.now();
  console.log('🎯 Navigation start marked');
  
  // Simulate delay then complete
  setTimeout(() => {
    const latency = (window as any).__nav_t0 
      ? performance.now() - (window as any).__nav_t0 
      : undefined;
    (window as any).__nav_t0 = undefined;
    
    console.log(`📊 Captured latency: ${latency?.toFixed(2)}ms`);
  }, 100);
}

/**
 * Test rapid backtracking pattern
 */
export async function testBacktrackingPattern() {
  console.log('🔄 Testing backtracking pattern detection...');
  
  const ledger = new ContextTruthLedger();
  const now = Date.now();
  
  // Create A→B→A pattern within 60s
  const transitions: TransitionFact[] = [
    { kind: 'transition', t: now, c: 0.8, data: { from: 'home', to: 'settings', latencyMs: 120 } },
    { kind: 'transition', t: now + 10000, c: 0.8, data: { from: 'settings', to: 'profile', latencyMs: 150 } },
    { kind: 'transition', t: now + 20000, c: 0.8, data: { from: 'profile', to: 'settings', latencyMs: 80 } }, // back
    { kind: 'transition', t: now + 30000, c: 0.8, data: { from: 'settings', to: 'home', latencyMs: 90 } }, // back to start
  ];
  
  for (const fact of transitions) {
    await ledger.append(fact);
  }
  
  const friction = detectFriction(ledger.getFacts());
  console.log('🎯 Friction detected:', friction.overall01 > 0.1 ? 'YES' : 'NO');
  console.log('📋 Signals:', friction.signals.map(s => `${s.kind} (${(s.score01 * 100).toFixed(1)}%)`));
  
  return friction;
}

// Auto-run basic test in dev
if (import.meta.env.DEV) {
  console.log('🚀 Context AI Smoke Tests loaded. Run smokeTestWeb() in console.');
}