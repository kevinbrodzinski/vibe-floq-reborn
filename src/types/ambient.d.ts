declare global {
  interface DeviceMotionEvent {
    // iOS Safari
    requestPermission?: () => Promise<'granted' | 'denied'>;
  }
  
  interface Window {
    DEBUG_ENV?: boolean;
  }
}
export {};