declare global {
  interface DeviceMotionEvent {
    // iOS Safari
    requestPermission?: () => Promise<'granted' | 'denied'>;
  }
}
export {};