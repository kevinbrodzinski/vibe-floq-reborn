import { AppState, AppStateStatus, Platform } from 'react-native';

let ScreenState: { addListener?: (cb:(s:'SCREEN_ON'|'SCREEN_OFF')=>void)=>{remove:()=>void} } | null = null;
try {
  // optional dep — present on Android only
  ScreenState = require('react-native-screen-state');
} catch {}

export class DeviceUsageTracker {
  private lastTick = Date.now();
  private activeMs = 0;

  // window since last state change
  private lastChange = Date.now();
  private screenOn = true;              // assume on
  private appState: AppStateStatus = AppState.currentState;
  private subApp?: { remove: () => void };
  private subScreen?: { remove: () => void };

  constructor() {
    // AppState fallback
    this.subApp = AppState.addEventListener('change', this.onAppState);

    // Android screen on/off (optional) - guard against iOS and missing module
    if (Platform.OS === 'android' && ScreenState?.addListener) {
      try {
        this.subScreen = ScreenState.addListener!((state) => {
          const now = Date.now();
          if (this.screenOn) this.activeMs += (now - this.lastChange);
          this.screenOn = (state === 'SCREEN_ON');
          this.lastChange = now;
        });
      } catch {
        // Graceful fallback if module fails to load
        this.subScreen = undefined;
      }
    } else {
      this.subScreen = undefined;
    }
  }

  private onAppState = (next: AppStateStatus) => {
    const now = Date.now();
    // Use AppState 'active' as last resort
    const wasOn = this.isForegroundActive();
    if (wasOn) this.activeMs += (now - this.lastChange);
    this.appState = next;
    this.lastChange = now;
  };

  private isForegroundActive() {
    // If we have precise screen state on Android, use it;
    // otherwise, treat 'active' as foreground.
    if (this.subScreen) return this.screenOn && this.appState === 'active';
    return this.appState === 'active';
  }

  /** 0..1 ratio since last pull; resets window */
  pullRatio(): number {
    const now = Date.now();
    if (this.isForegroundActive()) this.activeMs += (now - this.lastChange);

    const dt = Math.max(1, now - this.lastTick);
    const ratio = Math.max(0, Math.min(1, this.activeMs / dt));

    this.lastTick = now;
    this.lastChange = now;
    this.activeMs = 0;
    return ratio;
  }

  dispose() {
    try { this.subApp?.remove(); } catch {}
    try { this.subScreen?.remove?.(); } catch {}
  }
}
