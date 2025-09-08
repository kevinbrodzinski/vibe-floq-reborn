/**
 * Time-Lapse Controller
 * Captures field state every 30s, provides 10fps playback
 */

import { TimeLapseBuffer, TLFrame } from './TimeLapseBuffer';
import { downsampleFlows, downsampleStorms } from './downsample';

export class TimeLapseController {
  private buf = new TimeLapseBuffer(240); // ~2h @ 30s
  private lastCapture = 0;
  private SNAPSHOT_MS = 30_000; // 30 second intervals
  private playing = false;
  private playIdx = 0; // 0 newest .. capacity older
  private lastStep = 0;
  private STEP_MS = 100; // ~10fps playback

  constructor(private getData: () => ({
    flows: Array<{ x: number; y: number; vx: number; vy: number }>;
    storms: Array<{ x: number; y: number; intensity: number }>;
    auroraActive: number;
  })) {
    // Set DEV global for debugging
    if (import.meta.env.DEV) {
      (window as any).__timeLapseController = this;
    }
  }

  captureIfDue() {
    const now = performance.now();
    if (this.playing) return; // Don't capture during playback
    if (now - this.lastCapture < this.SNAPSHOT_MS) return;

    const d = this.getData();
    const frame: TLFrame = {
      t: Date.now(),
      flows: downsampleFlows(d.flows, 72, 256),
      storms: downsampleStorms(d.storms, 32),
      aurora: new Uint8Array([Math.min(255, d.auroraActive | 0)])
    };
    
    this.buf.push(frame);
    this.lastCapture = now;
    
    if (import.meta.env.DEV) {
      console.log(`[TimeLapse] Captured frame: ${d.flows.length} flows, ${d.storms.length} storms, ${d.auroraActive} aurora`);
    }
  }

  startPlayback() { 
    this.playing = true; 
    this.playIdx = 0; 
    this.lastStep = 0; 
    
    if (import.meta.env.DEV) {
      console.log('[TimeLapse] Starting playback');
    }
  }
  
  stopPlayback() { 
    this.playing = false; 
    
    if (import.meta.env.DEV) {
      console.log('[TimeLapse] Stopping playback');
    }
  }

  isPlaying(): boolean {
    return this.playing;
  }

  /** Returns a frame to draw every 100ms; UI must call stopPlayback to exit */
  step(): TLFrame | null {
    if (!this.playing) return null;
    
    const now = performance.now();
    if (now - this.lastStep < this.STEP_MS) return null;
    
    this.lastStep = now;
    const f = this.buf.getBack(this.playIdx++);
    
    if (!f) { 
      this.stopPlayback(); 
      return null; 
    }
    
    return f;
  }

  /**
   * Get controller stats
   */
  getStats() {
    return {
      ...this.buf.getStats(),
      playing: this.playing,
      playIdx: this.playIdx,
      lastCapture: this.lastCapture,
      timeSinceLastCapture: performance.now() - this.lastCapture
    };
  }

  /**
   * Skip to specific position in playback (0 = newest, 1 = oldest)
   */
  seekTo(position: number) {
    if (!this.playing) return;
    const maxIdx = this.buf.getStats().validFrames - 1;
    this.playIdx = Math.round(position * maxIdx);
  }
}