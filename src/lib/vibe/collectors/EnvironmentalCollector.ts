// Privacy-first environmental collector:
// - Audio: computes RMS level (0..1) via WebAudio Analyser, no recording or raw buffers persisted
// - Motion: variance from DeviceMotion / Generic Sensor (if available), minimal sampling
// - Small ring buffers (5–10s), outputs aggregates (rms, var, sample counts)
// - Permission-gated; degrades gracefully when denied/unsupported

/* eslint-disable @typescript-eslint/no-explicit-any */
import type { SignalCollector } from '@/types/vibe';

export type EnvironmentalSignal = {
  audioRms01?: number;
  motionVar01?: number;
  frames: { audio: number; motion: number };
  availability: { audio: boolean; motion: boolean };
};

const toClamp01 = (x: number) => Math.max(0, Math.min(1, x));
const nowMs = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

export class EnvironmentalCollector implements SignalCollector {
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

  constructor() {
    // no-op; call initPermissions() from UI before registering if you want explicit prompt
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

  // Lazily start audio chain
  private async ensureAudioChain(): Promise<boolean> {
    if (this.permissionAudio !== 'granted' || !this.audioSupported) return false;
    if (this.ctx && this.analyser) return true;

    try {
      this.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
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

  // Motion listener attach/detach
  private attachMotion() {
    if (!this.motionEnabled || !this.motionSupported) return;
    const handler = (e: DeviceMotionEvent) => {
      const ax = e.acceleration?.x ?? 0;
      const ay = e.acceleration?.y ?? 0;
      const az = e.acceleration?.z ?? 0;
      this.motionSamples.push(Math.sqrt(ax * ax + ay * ay + az * az));
      if (this.motionSamples.length > 64) this.motionSamples.shift();
    };
    window.addEventListener('devicemotion', handler, { passive: true });
    // Save off for cleanup
    (this as any)._motionHandler = handler;
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

    // Sample every call (~5s cadence from orchestrator)
    const t = nowMs();

    const audio = this.sampleAudioRms01();
    if (audio != null) this.audioWindow.push({ t, level: audio });

    const motion = this.sampleMotionVar01();
    if (motion != null) this.motionWindow.push({ t, var: motion });

    this.pruneWindows();

    // Aggregate micro-window
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

    // Quality = % of window covered with samples
    const targetFrames = Math.max(1, Math.round(this.windowMs / this.sampleEveryMs));
    const haveFrames = (this.audioWindow.length + this.motionWindow.length) / 2;
    const coverage = toClamp01(haveFrames / targetFrames);
    // Keep for getQuality()
    this.lastQuality = Math.max(0.3, coverage); // floor to 0.3 once active

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
    this.teardownAudio();
    this.detachMotion();
    this.audioWindow = [];
    this.motionWindow = [];
    this.motionSamples = [];
  }
}
