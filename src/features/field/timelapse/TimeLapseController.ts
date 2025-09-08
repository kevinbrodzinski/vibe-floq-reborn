/**
 * Time-Lapse Controller
 * Captures field state every 30s, provides 10fps playback
 */

import { TimeLapseBuffer, TLFrame } from './TimeLapseBuffer';
import { downsampleFlows, downsampleStorms } from './downsample';
import type { TLMarker } from './markers';

export class TimeLapseController {
  private buf = new TimeLapseBuffer(240); // ~2h @ 30s
  private lastCapture = 0;
  private SNAPSHOT_MS = 30_000; // 30 second intervals
  private playing = false;
  private playIdx = 0; // 0 newest .. capacity older
  private lastStep = 0;
  private STEP_MS = 100; // ~10fps playback
  private markers: TLMarker[] = [];

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
   * Get controller stats for header display
   */
  getStats() {
    const newest = this.buf.newest();
    const oldest = this.buf.oldest();
    let validFrames = 0; 
    for (const _ of this.buf.iterNewToOld()) { 
      validFrames++; 
    }
    
    return {
      playing: this.playing,
      playIdx: this.playIdx,
      validFrames,
      newestTime: newest?.t,
      oldestTime: oldest?.t,
      lastCapture: this.lastCapture,
      timeSinceLastCapture: performance.now() - this.lastCapture
    };
  }

  /**
   * Get current replay frame timestamp
   */
  getFrameTs(): number | undefined {
    if (!this.playing) return undefined;
    const frame = this.buf.getBack(this.playIdx - 1);
    return frame?.t;
  }
  
  /**
   * Get timestamp range for header
   */
  getRangeTs(): [number, number] {
    const stats = this.getStats();
    return [stats.oldestTime || Date.now(), stats.newestTime || Date.now()];
  }

  /**
   * Skip to specific position in playback (0 = newest, 1 = oldest)
   */
  seekTo(position: number) {
    if (!this.playing) return;
    const maxIdx = this.buf.getStats().validFrames - 1;
    this.playIdx = Math.round(position * maxIdx);
  }

  /**
   * Add markers from frame analysis
   */
  addMarkers(ms: TLMarker[]) { 
    if (ms?.length) this.markers.push(...ms); 
  }

  /**
   * Get all markers for visualization
   */
  getMarkers(): TLMarker[] { 
    return this.markers; 
  }

  /**
   * Seek to specific timestamp
   */
  seekToTs(ts: number) {
    // pick nearest frame time
    let bestIdx = 0, best = Number.POSITIVE_INFINITY;
    const stats = this.buf.getStats();
    for (let i = 0; i < stats.validFrames; i++) {
      const f = this.buf.getBack(i); 
      if (!f) break;
      const d = Math.abs(f.t - ts);
      if (d < best) { 
        best = d; 
        bestIdx = i; 
      }
    }
    this.playIdx = bestIdx;
  }
}