// Privacy-first environmental collector:
// - Audio: computes RMS level (0..1) via WebAudio Analyser, no recording or raw buffers persisted
// - Motion: variance from DeviceMotion / Generic Sensor (if available), minimal sampling
// - Small ring buffers (5–10s), outputs aggregates (rms, var, sample counts)
// - Permission-gated; degrades gracefully when denied/unsupported

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SignalCollector, EnvironmentalSignal } from '@/types/vibe';

const toClamp01 = (x: number) => Math.max(0, Math.min(1, x));
const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

// Debug logging (toggle in console: window.DEBUG_ENV = true)
const DEBUG_ENV = typeof window !== 'undefined' && (window as any).DEBUG_ENV;

export class EnvironmentalCollector implements SignalCollector<EnvironmentalSignal> {
  public readonly name = 'environmental';

  // Audio
  private ctx: AudioContext | null = null;
  private analyser: AnalyserNode | null = null;
  private audioStream: MediaStream | null = null;
  private audioBuf: Float32Array | null = null;

  // Motion
  private motionEnabled = false;
  private lastAccel: { x: number; y: number; z: number } | null = null;
  private motionSamples: number[] = [];

  // Windows (ms)
  private readonly windowMs = 8000; // ~8s micro-window
  private readonly sampleEveryMs = 250; // sample cadence

  // Ring buffers (timestamps + values)
  private audioWindow: Array<{ t: number; level: number }> = [];
  private motionWindow: Array<{ t: number; var: number }> = [];

  private permissionAudio: PermissionState | 'prompt' | 'granted' | 'denied' = 'prompt';
  private audioSupported = typeof navigator !== 'undefined' && !!navigator.mediaDevices?.getUserMedia;
  private motionSupported = typeof window !== 'undefined' && ('DeviceMotionEvent' in window);

  // Quality tracking
  private lastQuality = 0;

  // Internal sampling timer
  private samplingTimer: ReturnType<typeof setInterval> | null = null;

  // Visibility handler for battery optimization
  private visHandler = () => {
    if (typeof document !== 'undefined' && document.hidden) {
      this.stopSamplingLoop();
    } else if (this.permissionAudio === 'granted' || this.motionEnabled) {
      this.startSamplingLoop();
    }
  };

  constructor() {
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.visHandler, { passive: true });
    }
  }

  isAvailable(): boolean {
    return this.audioSupported || this.motionSupported;
  }

  async initPermissions(withAudio = true, withMotion = true): Promise<{ audio?: boolean; motion?: boolean }> {
    const state: { audio?: boolean; motion?: boolean } = {};

    // AUDIO permission request (mic) — we never record, only RMS level
    if (withAudio && this.audioSupported) {
      try {
        // Ask for permission explicitly
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true }, video: false });
        // Keep stream stopped until collector starts (we only need it on demand)
        stream.getTracks().forEach(tr => tr.stop());
        this.permissionAudio = 'granted';
        state.audio = true;
      } catch {
        this.permissionAudio = 'denied';
        state.audio = false;
      }
    }

    // MOTION permission (iOS Safari requires requestPermission)
    if (withMotion && this.motionSupported) {
      try {
        const anyDM = (window as any).DeviceMotionEvent;
        if (anyDM?.requestPermission) {
          const res = await anyDM.requestPermission();
          this.motionEnabled = res === 'granted';
        } else {
          // Non-iOS Safari: enabled by default; we'll attach listener lazily
          this.motionEnabled = true;
        }
        state.motion = this.motionEnabled;
      } catch {
        this.motionEnabled = false;
        state.motion = false;
      }
    }

    return state;
  }

  // Internal sampling loop (250ms cadence)
  private startSamplingLoop() {
    if (this.samplingTimer) return; // already running

    this.samplingTimer = setInterval(() => {
      const t = nowMs();
      
      // Sample audio RMS
      const audio = this.sampleAudioRms01();
      if (audio != null) this.audioWindow.push({ t, level: audio });

      // Sample motion variance
      const motion = this.sampleMotionVar01();
      if (motion != null) this.motionWindow.push({ t, var: motion });

      // Prune old samples
      this.pruneWindows();
    }, this.sampleEveryMs);
  }

  private stopSamplingLoop() {
    if (this.samplingTimer) {
      clearInterval(this.samplingTimer);
      this.samplingTimer = null;
    }
  }

  // Stop environmental collection (battery hygiene)
  stop() {
    this.stopSamplingLoop();
  }

  // Lazily start audio chain
  private async ensureAudioChain(): Promise<boolean> {
    if (this.permissionAudio !== 'granted' || !this.audioSupported) return false;
    if (this.ctx && this.analyser) return true;

    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
      
      // Resume context for iOS Safari
      await this.ctx.resume?.().catch(() => {});
      
      this.audioStream = await navigator.mediaDevices.getUserMedia({ 
        audio: { echoCancellation: true, noiseSuppression: true }, 
        video: false 
      });
      const src = this.ctx.createMediaStreamSource(this.audioStream);
      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 1024;
      // Create a proper Float32Array with the right buffer type
      this.audioBuf = new Float32Array(new ArrayBuffer(this.analyser.fftSize * 4));
      src.connect(this.analyser);
      return true;
    } catch (err) {
      console.warn('Audio chain setup failed:', err);
      this.teardownAudio();
      return false;
    }
  }

  private teardownAudio() {
    try { this.audioStream?.getTracks().forEach(t => t.stop()); } catch {}
    try { this.ctx?.close(); } catch {}
    this.ctx = null;
    this.analyser = null;
    this.audioStream = null;
    this.audioBuf = null;
  }

  // Motion listener attach/detach with iOS fallback detection
  private motionWarmupTimer: ReturnType<typeof setTimeout> | null = null;

  private attachMotion() {
    if (!this.motionEnabled || !this.motionSupported) return;
    if ((this as any)._motionHandler) return; // already attached
    
    let first = true;
    const handler = (e: DeviceMotionEvent) => {
      first = false; // mark that we received an event
      const ax = e.acceleration?.x ?? 0;
      const ay = e.acceleration?.y ?? 0;
      const az = e.acceleration?.z ?? 0;
      this.motionSamples.push(Math.sqrt(ax * ax + ay * ay + az * az));
      if (this.motionSamples.length > 64) this.motionSamples.shift();
    };
    window.addEventListener('devicemotion', handler, { passive: true });
    (this as any)._motionHandler = handler;

    // iOS fallback: if no events arrive in 5s, consider motion unavailable
    this.motionWarmupTimer = setTimeout(() => {
      if (first) { // nothing arrived
        this.detachMotion();
        this.motionEnabled = false;
      }
    }, 5000);
  }

  private detachMotion() {
    const handler = (this as any)._motionHandler;
    if (handler) {
      try { window.removeEventListener('devicemotion', handler); } catch {}
      (this as any)._motionHandler = null;
    }
  }

  private sampleAudioRms01(): number | null {
    if (!this.analyser || !this.audioBuf) return null;
    
    try {
      // Create a temporary buffer to avoid type issues
      const tempBuf = new Float32Array(this.analyser.fftSize);
      this.analyser.getFloatTimeDomainData(tempBuf);
      
      // Compute RMS (no raw persistence)
      let sum = 0;
      const length = tempBuf.length;
      for (let i = 0; i < length; i++) {
        const v = tempBuf[i];
        sum += v * v;
      }
      const rms = Math.sqrt(sum / length);
      // Normalize: 0..~0.5 (rough) -> clamp 0..1
      return toClamp01(rms * 3);
    } catch (err) {
      console.warn('Audio RMS sampling failed:', err);
      return null;
    }
  }

  private sampleMotionVar01(): number | null {
    if (this.motionSamples.length < 4) return null;
    const xs = this.motionSamples;
    const mean = xs.reduce((a, b) => a + b, 0) / xs.length;
    const variance = xs.reduce((acc, v) => acc + Math.pow(v - mean, 2), 0) / xs.length;
    // Normalize variance to 0..1 by an arbitrary cap (~active walking threshold)
    const norm = toClamp01(variance / 2.0);
    return norm;
  }

  private pruneWindows() {
    const cutoff = nowMs() - this.windowMs;
    this.audioWindow = this.audioWindow.filter(p => p.t >= cutoff);
    this.motionWindow = this.motionWindow.filter(p => p.t >= cutoff);
  }

  async collect(): Promise<EnvironmentalSignal | null> {
    // Attempt to activate sensors lazily
    if (this.permissionAudio === 'granted') await this.ensureAudioChain();
    if (this.motionEnabled && !(this as any)._motionHandler) this.attachMotion();

    // Ensure we're sampling at 250ms in the background
    this.startSamplingLoop();

    // Aggregate micro-window (already collected via sampling loop)
    const audioRms01 =
      this.audioWindow.length > 0
        ? this.audioWindow.reduce((a, b) => a + b.level, 0) / this.audioWindow.length
        : undefined;
    const motionVar01 =
      this.motionWindow.length > 0
        ? this.motionWindow.reduce((a, b) => a + b.var, 0) / this.motionWindow.length
        : undefined;

    // If neither present, return null (avoid affecting engine)
    if (audioRms01 == null && motionVar01 == null) return null;

    // Quality = coverage measured in time, not expected frames
    const totalSamples = this.audioWindow.length + this.motionWindow.length;
    const coverage = Math.min(1, totalSamples * this.sampleEveryMs / this.windowMs);
    this.lastQuality = Math.max(0.3, coverage); // floor to 0.3 once active

    if (DEBUG_ENV) {
      console.log('[env] quality', this.lastQuality, 'frames', this.audioWindow.length, this.motionWindow.length);
    }

    return {
      audioRms01,
      motionVar01,
      frames: { audio: this.audioWindow.length, motion: this.motionWindow.length },
      availability: { audio: !!this.analyser, motion: !!(this as any)._motionHandler },
    };
  }

  getQuality(): number {
    return toClamp01(this.lastQuality);
  }

  dispose() {
    // Stop sampling loop
    this.stopSamplingLoop();
    
    // Clear warmup timer
    if (this.motionWarmupTimer) {
      clearTimeout(this.motionWarmupTimer);
      this.motionWarmupTimer = null;
    }
    
    // Remove visibility listener
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.visHandler as any);
    }
    
    // Cleanup audio/motion
    this.teardownAudio();
    this.detachMotion();
    
    // Clear buffers
    this.audioWindow = [];
    this.motionWindow = [];
    this.motionSamples = [];
  }
}
