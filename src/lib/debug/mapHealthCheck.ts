/**
 * Map Health Check System
 * Automated diagnostics for map initialization issues
 */

export interface MapHealthReport {
  overall: 'healthy' | 'warning' | 'error';
  checks: {
    container: boolean;
    token: boolean;
    webgl: number;
    canvas: number;
    globalMap: boolean;
    tokenSource?: string;
  };
  recommendations: string[];
}

/**
 * Comprehensive health check for map system
 */
export function runMapHealthCheck(): MapHealthReport {
  const checks = {
    container: !!document.querySelector('[data-map-container]'),
    token: !!(window as any).mapboxgl?.accessToken,
    webgl: performance.getEntriesByType('frame').filter(e => e.name?.includes('WebGL')).length,
    canvas: document.querySelectorAll('.mapboxgl-canvas').length,
    globalMap: !!(window as any).__FLOQ_MAP,
    tokenSource: undefined as string | undefined
  };

  // Get token source if available
  const token = (window as any).mapboxgl?.accessToken;
  if (token) {
    if (token.includes('pk.eyJ1Ijoia2V2aW5icm9kemluc2tpIi')) {
      checks.tokenSource = 'fallback';
    } else {
      checks.tokenSource = 'environment';
    }
  }

  const recommendations: string[] = [];

  // Analyze results and generate recommendations
  if (!checks.container) {
    recommendations.push('❌ Container missing - FieldWebMap may not be rendering');
  }

  if (!checks.token) {
    recommendations.push('❌ No Mapbox token - check getMapboxToken() function');
  }

  if (checks.webgl > 1) {
    recommendations.push(`⚠️ ${checks.webgl} WebGL contexts active - possible memory leak`);
  }

  if (checks.container && !checks.canvas) {
    recommendations.push('❌ Container exists but no canvas - map initialization failed');
  }

  if (checks.container && !checks.globalMap) {
    recommendations.push('❌ Container exists but no global map - check map load event');
  }

  if (checks.tokenSource === 'fallback') {
    recommendations.push('⚠️ Using fallback token - set VITE_MAPBOX_TOKEN for production');
  }

  // Determine overall health
  let overall: 'healthy' | 'warning' | 'error';
  
  if (!checks.container || !checks.token || (checks.container && !checks.canvas)) {
    overall = 'error';
  } else if (checks.webgl > 1 || checks.tokenSource === 'fallback') {
    overall = 'warning';
  } else {
    overall = 'healthy';
  }

  return {
    overall,
    checks,
    recommendations
  };
}

/**
 * Console-friendly health check with formatted output
 */
export function logMapHealth(): MapHealthReport {
  const report = runMapHealthCheck();
  
  console.log('\n🏥 === MAP HEALTH CHECK ===');
  console.log(`Overall Status: ${getHealthEmoji(report.overall)} ${report.overall.toUpperCase()}`);
  
  console.log('\n📋 Checks:');
  console.log(`  Container in DOM: ${report.checks.container ? '✅' : '❌'}`);
  console.log(`  Token set: ${report.checks.token ? '✅' : '❌'}${report.checks.tokenSource ? ` (${report.checks.tokenSource})` : ''}`);
  console.log(`  WebGL contexts: ${report.checks.webgl} ${report.checks.webgl <= 1 ? '✅' : '⚠️'}`);
  console.log(`  Canvas elements: ${report.checks.canvas} ${report.checks.canvas === 1 ? '✅' : report.checks.canvas === 0 ? '❌' : '⚠️'}`);
  console.log(`  Global map: ${report.checks.globalMap ? '✅' : '❌'}`);
  
  if (report.recommendations.length > 0) {
    console.log('\n💡 Recommendations:');
    report.recommendations.forEach(rec => console.log(`  ${rec}`));
  } else {
    console.log('\n🎉 No issues detected!');
  }
  
  console.log('\n🔧 Quick fixes:');
  console.log('  - window.quickMapFixes() - Detailed diagnostics');
  console.log('  - window.realityCheckMapbox() - Test raw Mapbox');
  console.log('  - window.checkContainerHeight() - Check container sizing');
  
  return report;
}

function getHealthEmoji(health: string): string {
  switch (health) {
    case 'healthy': return '🟢';
    case 'warning': return '🟡';
    case 'error': return '🔴';
    default: return '❓';
  }
}

// Auto-setup in development
if (import.meta.env.DEV && typeof window !== 'undefined') {
  setTimeout(() => {
    (window as any).mapHealthCheck = logMapHealth;
    console.log('🏥 Map health check available: window.mapHealthCheck()');
  }, 1500);
}