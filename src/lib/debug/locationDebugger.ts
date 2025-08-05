/**
 * Enhanced location debugging to track permission flow
 */

export function setupLocationDebugger() {
  if (typeof window === 'undefined') return;
  
  // Track all location-related calls
  const originalGetCurrentPosition = navigator.geolocation?.getCurrentPosition;
  const originalWatchPosition = navigator.geolocation?.watchPosition;
  
  if (originalGetCurrentPosition) {
    navigator.geolocation.getCurrentPosition = function(success, error, options) {
      console.log('[🎯 LocationDebugger] getCurrentPosition called with options:', options);
      
      const wrappedSuccess = (position: GeolocationPosition) => {
        console.log('[🎯 LocationDebugger] ✅ Location success:', {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: new Date(position.timestamp).toISOString()
        });
        success(position);
      };
      
      const wrappedError = (err: GeolocationPositionError) => {
        console.log('[🎯 LocationDebugger] ❌ Location error:', {
          code: err.code,
          message: err.message,
          codes: {
            1: 'PERMISSION_DENIED',
            2: 'POSITION_UNAVAILABLE', 
            3: 'TIMEOUT'
          }[err.code]
        });
        error?.(err);
      };
      
      return originalGetCurrentPosition.call(this, wrappedSuccess, wrappedError, options);
    };
  }
  
  if (originalWatchPosition) {
    navigator.geolocation.watchPosition = function(success, error, options) {
      console.log('[🎯 LocationDebugger] watchPosition called with options:', options);
      
      const wrappedSuccess = (position: GeolocationPosition) => {
        console.log('[🎯 LocationDebugger] 🔄 Watch position update:', {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          accuracy: position.coords.accuracy
        });
        success(position);
      };
      
      const wrappedError = (err: GeolocationPositionError) => {
        console.log('[🎯 LocationDebugger] ❌ Watch position error:', err.message);
        error?.(err);
      };
      
      return originalWatchPosition.call(this, wrappedSuccess, wrappedError, options);
    };
  }
  
  // Add debug commands to window
  (window as any).debugLocation = {
    checkPermission: async () => {
      try {
        const result = await navigator.permissions.query({ name: 'geolocation' });
        console.log('[🎯 LocationDebugger] Permission state:', result.state);
        return result.state;
      } catch (e) {
        console.log('[🎯 LocationDebugger] Permission API not supported');
        return 'unknown';
      }
    },
    
    testLocation: () => {
      console.log('[🎯 LocationDebugger] Testing location request...');
      navigator.geolocation?.getCurrentPosition(
        (pos) => console.log('[🎯 LocationDebugger] Test success:', pos.coords),
        (err) => console.log('[🎯 LocationDebugger] Test failed:', err.message),
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    },
    
    checkMapboxToken: () => {
      const envToken = import.meta.env.VITE_MAPBOX_TOKEN;
      const mapboxToken = (window as any).mapboxgl?.accessToken;
      
      console.log('[🎯 LocationDebugger] Token check:', {
        envToken: envToken ? `${envToken.substring(0, 10)}...` : 'NOT_SET',
        mapboxToken: mapboxToken ? `${mapboxToken.substring(0, 10)}...` : 'NOT_SET',
        matches: envToken === mapboxToken,
        isYourToken: envToken?.includes('pk.eyJ1Ijoia2V2aW5icm9kemluc2tpIiwiYSI6ImNtZGR6b2VhZzBhazMyaW9vbG9lc3B6d3cifQ')
      });
    }
  };
  
  console.log('[🎯 LocationDebugger] Debug commands available:');
  console.log('  - window.debugLocation.checkPermission() - Check location permission state');
  console.log('  - window.debugLocation.testLocation() - Test location request');
  console.log('  - window.debugLocation.checkMapboxToken() - Verify token loading');
}

// Auto-setup in development
if (import.meta.env.DEV) {
  setupLocationDebugger();
}

/**
 * Location State Debugger
 * Helps debug when maps get stuck in loading due to location issues
 */

if (import.meta.env.DEV && typeof window !== 'undefined') {
  // Add global debug function for location state
  (window as any).debugLocationState = () => {
    console.group('🗺️ Location State Debug');
    
    // Check localStorage for debug location
    const debugLoc = localStorage.getItem('floq-debug-forceLoc');
    console.log('Debug location set:', debugLoc || 'None');
    
    // Check geolocation permission state
    if ('permissions' in navigator) {
      navigator.permissions.query({ name: 'geolocation' }).then(result => {
        console.log('Geolocation permission:', result.state);
      }).catch(e => console.log('Permission query failed:', e));
    }
    
    // Check if location is available
    if ('geolocation' in navigator) {
      console.log('Geolocation API available: Yes');
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          console.log('Current position:', {
            lat: pos.coords.latitude,
            lng: pos.coords.longitude,
            accuracy: pos.coords.accuracy
          });
        },
        (err) => {
          console.log('Position error:', err.message, 'Code:', err.code);
        },
        { timeout: 5000 }
      );
    } else {
      console.log('Geolocation API available: No');
    }
    
    // Check map state
    const map = (window as any).__FLOQ_MAP;
    console.log('Map instance exists:', !!map);
    if (map) {
      console.log('Map ready:', map.loaded());
      console.log('Map center:', map.getCenter());
    }
    
    console.groupEnd();
  };
  
  // Auto-debug on page load after a delay
  setTimeout(() => {
    console.log('🔧 Location debugger loaded. Run debugLocationState() to check location state.');
  }, 2000);
}