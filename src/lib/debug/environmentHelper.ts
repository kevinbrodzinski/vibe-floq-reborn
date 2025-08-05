/**
 * Environment Configuration Helper
 * Easy commands to switch between mock and live modes
 */

export function enableLiveMode() {
  console.log('🔧 Enabling LIVE mode...');
  
  const config = {
    presenceMode: 'live',
    enableRealtime: true, 
    enablePresenceUpdates: true,
    rollout: 100
  };
  
  localStorage.setItem('floq-env-override', JSON.stringify(config));
  
  console.log('✅ Live mode enabled. Reload the page to apply changes.');
  console.log('🔄 Run: location.reload()');
  
  return config;
}

export function enableMockMode() {
  console.log('🔧 Enabling MOCK mode...');
  
  const config = {
    presenceMode: 'mock',
    enableRealtime: false,
    enablePresenceUpdates: false  
  };
  
  localStorage.setItem('floq-env-override', JSON.stringify(config));
  
  console.log('✅ Mock mode enabled. Reload the page to apply changes.');
  console.log('🔄 Run: location.reload()');
  
  return config;
}

export function clearEnvironmentOverride() {
  localStorage.removeItem('floq-env-override');
  console.log('✅ Environment override cleared. Reload to use default/build-time settings.');
  console.log('🔄 Run: location.reload()');
}

export function showCurrentEnvironment() {
  const override = localStorage.getItem('floq-env-override');
  
  console.log('🌍 === CURRENT ENVIRONMENT CONFIG ===');
  
  if (override) {
    console.log('📝 Local Override Active:', JSON.parse(override));
  } else {
    console.log('📝 No local override - using build-time defaults');
  }
  
  console.log('\n🔧 Environment Variables:');
  console.log('VITE_FLOQ_PRESENCE_MODE:', import.meta.env.VITE_FLOQ_PRESENCE_MODE);
  console.log('VITE_FLOQ_ENABLE_REALTIME:', import.meta.env.VITE_FLOQ_ENABLE_REALTIME);
  console.log('VITE_FLOQ_ENABLE_PRESENCE:', import.meta.env.VITE_FLOQ_ENABLE_PRESENCE);
  console.log('VITE_FLOQ_ROLLOUT:', import.meta.env.VITE_FLOQ_ROLLOUT);
  
  return { override, env: import.meta.env };
}

// Auto-setup in development
if (import.meta.env.DEV && typeof window !== 'undefined') {
  setTimeout(() => {
    (window as any).enableLiveMode = enableLiveMode;
    (window as any).enableMockMode = enableMockMode; 
    (window as any).clearEnvironmentOverride = clearEnvironmentOverride;
    (window as any).showCurrentEnvironment = showCurrentEnvironment;
    
    console.log('🌍 [Environment] Helper functions available:');
    console.log('  - window.enableLiveMode()');
    console.log('  - window.enableMockMode()'); 
    console.log('  - window.clearEnvironmentOverride()');
    console.log('  - window.showCurrentEnvironment()');
  }, 1000);
}