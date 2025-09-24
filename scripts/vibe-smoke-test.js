#!/usr/bin/env node

// Quick smoke test for Vibe Phase 1 MVP
const { evaluate } = require('./src/core/vibe/VibeEngine.ts');

console.log('🎵 Vibe Engine Smoke Test');
console.log('========================');

// Test 1: Basic evaluation
const basic = evaluate({ hour: 18, isWeekend: false });
console.log('✓ Basic evaluation:', basic.vibe, `(${(basic.confidence01*100).toFixed(0)}%)`);

// Test 2: Performance check
const start = Date.now();
const perf = evaluate({ hour: 12, isWeekend: false, speedMps: 1.0, dwellMinutes: 5 });
const elapsed = Date.now() - start;
console.log('✓ Performance:', `${elapsed}ms`, perf.calcMs < 80 ? 'PASS' : 'FAIL');

// Test 3: Weekend vs weekday
const weekday = evaluate({ hour: 18, isWeekend: false });
const weekend = evaluate({ hour: 18, isWeekend: true });
console.log('✓ Weekday vs Weekend:', weekday.vibe, 'vs', weekend.vibe);

// Test 4: Movement influence
const stationary = evaluate({ hour: 18, isWeekend: false, speedMps: 0 });
const moving = evaluate({ hour: 18, isWeekend: false, speedMps: 1.5 });
console.log('✓ Movement influence:', stationary.vibe, 'vs', moving.vibe);

console.log('\n🎯 To test in browser:');
console.log('- Open dev console');
console.log('- Run: floq.vibeNow()');
console.log('- Run: floq.vibeTest() for movement simulation');
console.log('- Flip VibeDebugPanel open={true} for live monitoring');