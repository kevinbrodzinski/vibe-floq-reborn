import { storage } from '@/lib/storage';
import type { WorkingSet } from './types';

export interface ApplicationContext {
  vibeEngine?: any;
  insights?: any;
  patterns?: any;
  location?: { lat: number; lng: number } | null;
}

export interface TieredCache {
  l1: Map<string, any>; // Hot data
  l2: Map<string, any>; // Warm data  
  l3: Map<string, any>; // Cold data
}

export interface ResourceState {
  battery: number;
  memory: number;
  network: 'fast' | 'slow' | 'offline';
  cpu: 'low' | 'medium' | 'high';
}

export interface RestorePriority {
  component: string;
  cost: number;
  critical: boolean;
}

/**
 * Working Set Manager - Captures and restores application context
 * Enables seamless session restoration and context switching
 */
export class WorkingSetManager {
  private static readonly STORAGE_KEY = 'floq:context:working_set:v2';
  private static readonly SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutes
  
  private cache: TieredCache = {
    l1: new Map(),
    l2: new Map(),
    l3: new Map()
  };

  async extract(context: ApplicationContext): Promise<WorkingSet> {
    const timestamp = Date.now();
    
    const workingSet: WorkingSet = {
      // Core vibe and pattern data
      currentVibe: context.vibeEngine?.currentReading?.vibe || 'balanced',
      confidence: context.vibeEngine?.currentReading?.confidence01 || 0,
      components: context.vibeEngine?.currentReading?.components || {},
      patterns: context.insights?.hasEnoughData ? context.insights : null,
      venueContext: context.vibeEngine?.currentReading?.venueIntelligence || null,
      
      // Session metadata
      timestamp,
      sessionDuration: this.getSessionDuration(),
      
      // Extended context for advanced restoration
      viewState: await this.captureViewState(),
      focus: this.captureFocus(),
      drafts: await this.collectDrafts(),
      references: this.collectReferences(context),
      taskMarkers: this.extractPendingActions(),
      relationships: this.extractRelationships(context),
      
      metadata: {
        extractedAt: timestamp,
        contextHash: await this.hashContext(context),
        deviceClass: this.getDeviceClass(),
        resourceState: this.getResourceState()
      }
    };

    // Cache in L1 for immediate access
    this.cache.l1.set('current', workingSet);
    
    return workingSet;
  }

  async restore(workingSet: WorkingSet): Promise<void> {
    const resourceState = this.getResourceState();
    const priorities = this.determinePriorities(resourceState);
    
    // Restore in priority order with resource awareness
    for (const priority of priorities) {
      if (!this.shouldContinue(resourceState)) break;
      
      try {
        await this.restoreComponent(priority, workingSet);
        
        // Yield to prevent UI blocking
        await new Promise(resolve => 
          requestAnimationFrame ? requestAnimationFrame(resolve) : setTimeout(resolve, 0)
        );
      } catch (error) {
        console.warn(`Failed to restore ${priority.component}:`, error);
      }
    }
  }

  async save(workingSet: WorkingSet): Promise<void> {
    try {
      await storage.setJSON(WorkingSetManager.STORAGE_KEY, {
        ...workingSet,
        savedAt: Date.now()
      });
      
      // Move to L2 cache
      this.cache.l2.set('saved', workingSet);
    } catch (error) {
      console.warn('Failed to save working set:', error);
    }
  }

  async load(): Promise<WorkingSet | null> {
    try {
      // Check L1 cache first
      const cached = this.cache.l1.get('current');
      if (cached) return cached;
      
      // Check L2 cache
      const l2Cached = this.cache.l2.get('saved');
      if (l2Cached) {
        this.cache.l1.set('current', l2Cached);
        return l2Cached;
      }
      
      // Load from storage
      const stored = await storage.getJSON<WorkingSet & { savedAt: number }>(
        WorkingSetManager.STORAGE_KEY
      );
      
      if (!stored) return null;
      
      // Check if still valid
      const age = Date.now() - stored.savedAt;
      if (age > WorkingSetManager.SESSION_TIMEOUT) {
        return null;
      }
      
      const { savedAt, ...workingSet } = stored;
      
      // Cache for future access
      this.cache.l1.set('current', workingSet);
      
      return workingSet;
    } catch (error) {
      console.warn('Failed to load working set:', error);
      return null;
    }
  }

  async hasValidSession(): Promise<boolean> {
    const workingSet = await this.load();
    return workingSet !== null;
  }

  private async captureViewState(): Promise<any> {
    return {
      route: window.location.pathname,
      scroll: window.scrollY || 0,
      viewport: {
        width: window.innerWidth,
        height: window.innerHeight
      },
      activePanel: this.getActivePanel(),
      zoom: this.getZoomLevel()
    };
  }

  private captureFocus(): any {
    const activeElement = document.activeElement;
    return {
      elementId: activeElement?.id || null,
      elementType: activeElement?.tagName?.toLowerCase() || null,
      caretPosition: this.getCaretPosition(),
      selection: window.getSelection()?.toString() || null
    };
  }

  private async collectDrafts(): Promise<any> {
    // Collect any unsaved form data, text drafts, etc.
    const drafts: any = {};
    
    // Look for draft data in storage
    try {
      const draftKeys = ['message_draft', 'plan_draft', 'vibe_note_draft'];
      for (const key of draftKeys) {
        const draft = await storage.getJSON(key);
        if (draft) {
          drafts[key] = draft;
        }
      }
    } catch (error) {
      console.warn('Failed to collect drafts:', error);
    }
    
    return drafts;
  }

  private collectReferences(context: ApplicationContext): any {
    return {
      currentLocation: context.location,
      recentVibes: context.insights?.temporalPrefs || {},
      activePatterns: context.patterns?.active || [],
      venueContext: context.vibeEngine?.currentReading?.venueIntelligence
    };
  }

  private extractPendingActions(): any {
    // Look for incomplete tasks, notifications, pending operations
    return {
      notifications: this.getPendingNotifications(),
      incompleteFlows: this.getIncompleteFlows(),
      queuedActions: this.getQueuedActions()
    };
  }

  private extractRelationships(context: ApplicationContext): any {
    return {
      nearbyUsers: [], // Future: integrate with presence system
      activeFloqs: [], // Future: integrate with floq system
      recentInteractions: []
    };
  }

  private determinePriorities(resources: ResourceState): RestorePriority[] {
    const basePriorities: RestorePriority[] = [
      { component: 'viewState', cost: 10, critical: true },
      { component: 'activeData', cost: 20, critical: true },
      { component: 'focus', cost: 5, critical: false },
      { component: 'drafts', cost: 15, critical: false },
      { component: 'references', cost: 25, critical: false },
      { component: 'taskMarkers', cost: 20, critical: false },
      { component: 'relationships', cost: 30, critical: false }
    ];

    // Adapt based on resource constraints
    if (resources.battery < 20 || resources.memory < 100) {
      return basePriorities.filter(p => p.critical);
    }
    
    if (resources.network === 'slow') {
      return basePriorities.filter(p => p.cost < 25);
    }
    
    return basePriorities;
  }

  private shouldContinue(resources: ResourceState): boolean {
    return resources.battery > 10 && resources.memory > 50;
  }

  private async restoreComponent(priority: RestorePriority, workingSet: WorkingSet): Promise<void> {
    switch (priority.component) {
      case 'viewState':
        await this.restoreViewState(workingSet.viewState);
        break;
      case 'activeData':
        await this.restoreActiveData(workingSet);
        break;
      case 'focus':
        await this.restoreFocus(workingSet.focus);
        break;
      case 'drafts':
        await this.restoreDrafts(workingSet.drafts);
        break;
      case 'references':
        await this.restoreReferences(workingSet.references);
        break;
      default:
        // Placeholder for other components
        break;
    }
  }

  private async restoreViewState(viewState: any): Promise<void> {
    if (!viewState) return;
    
    // Restore scroll position
    if (typeof viewState.scroll === 'number') {
      window.scrollTo(0, viewState.scroll);
    }
    
    // Dispatch event for components to restore their state
    window.dispatchEvent(new CustomEvent('context:restore_view_state', {
      detail: viewState
    }));
  }

  private async restoreActiveData(workingSet: WorkingSet): Promise<void> {
    // Restore vibe engine state if needed
    if ((window as any).vibeEngine && workingSet.currentVibe) {
      window.dispatchEvent(new CustomEvent('context:restore_vibe', {
        detail: {
          vibe: workingSet.currentVibe,
          confidence: workingSet.confidence,
          components: workingSet.components
        }
      }));
    }
  }

  private async restoreFocus(focus: any): Promise<void> {
    if (!focus || !focus.elementId) return;
    
    // Wait a bit for DOM to be ready
    setTimeout(() => {
      const element = document.getElementById(focus.elementId);
      if (element && element.focus) {
        element.focus();
        
        // Restore caret position if applicable
        if (focus.caretPosition && 'setSelectionRange' in element) {
          (element as any).setSelectionRange(focus.caretPosition, focus.caretPosition);
        }
      }
    }, 100);
  }

  private async restoreDrafts(drafts: any): Promise<void> {
    if (!drafts) return;
    
    // Restore drafts to storage for components to pick up
    for (const [key, draft] of Object.entries(drafts)) {
      try {
        await storage.setJSON(key, draft);
      } catch (error) {
        console.warn(`Failed to restore draft ${key}:`, error);
      }
    }
  }

  private async restoreReferences(references: any): Promise<void> {
    // Dispatch event with reference data for components to use
    window.dispatchEvent(new CustomEvent('context:restore_references', {
      detail: references
    }));
  }

  // Helper methods
  private getSessionDuration(): number {
    const sessionStart = parseInt(localStorage.getItem('session_start') || '0');
    return sessionStart ? Date.now() - sessionStart : 0;
  }

  private getActivePanel(): string | null {
    // Detect which panel/section is currently active
    return document.querySelector('[data-active-panel]')?.getAttribute('data-active-panel') || null;
  }

  private getZoomLevel(): number {
    return window.devicePixelRatio || 1;
  }

  private getCaretPosition(): number {
    const selection = window.getSelection();
    return selection ? selection.anchorOffset : 0;
  }

  private async hashContext(context: ApplicationContext): Promise<string> {
    const contextStr = JSON.stringify({
      vibe: context.vibeEngine?.currentReading?.vibe,
      timestamp: Date.now(),
      route: window.location.pathname
    });
    
    const encoder = new TextEncoder();
    const data = encoder.encode(contextStr);
    const hashBuffer = await crypto.subtle.digest('SHA-256', data);
    
    return Array.from(new Uint8Array(hashBuffer))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
  }

  private getDeviceClass(): string {
    const memory = (navigator as any).deviceMemory || 4;
    const cores = navigator.hardwareConcurrency || 2;
    
    if (memory >= 8 && cores >= 4) return 'high-end';
    if (memory >= 4 && cores >= 2) return 'mid-range';
    return 'low-end';
  }

  private getResourceState(): ResourceState {
    const nav = navigator as any;
    
    return {
      battery: nav.getBattery?.()?.level * 100 || 100,
      memory: (performance as any).memory?.usedJSHeapSize / (1024 * 1024) || 50,
      network: nav.connection?.effectiveType?.includes('4g') ? 'fast' : 'slow',
      cpu: this.getCPUClass()
    };
  }

  private getCPUClass(): 'low' | 'medium' | 'high' {
    const cores = navigator.hardwareConcurrency || 2;
    if (cores >= 8) return 'high';
    if (cores >= 4) return 'medium';
    return 'low';
  }

  private getPendingNotifications(): any[] {
    // Future: integrate with notification system
    return [];
  }

  private getIncompleteFlows(): any[] {
    // Future: track incomplete user flows
    return [];
  }

  private getQueuedActions(): any[] {
    // Future: track queued actions
    return [];
  }
}