import { ContextTruthLedger } from './ContextTruthLedger';
import { storage } from '@/lib/storage';
import type {
  ContextFact, ContextFactWithId,
  TransitionFact, NoteFact
} from './types';

/** Persisted schema */
export interface ViewState {
  route: string;                    // canonical route/screen id
  params?: Record<string, unknown>; // lightweight params
  scrollY?: number;
  selectionId?: string;
  t: number;                        // last updated (ms)
}

export interface Draft {
  id: string;
  type: 'note' | 'message' | 'plan' | string;
  payload: unknown;
  updatedAt: number;
}

export interface Focus {
  id: string;
  kind: 'item' | 'field' | 'pane';
  label?: string;
  t: number;
}

export interface WorkingSetSnapshot {
  viewStack: ViewState[];           // last N views (top = current)
  drafts: Record<string, Draft>;    // by id
  focus?: Focus;
  refs?: string[];                  // free-form references (urls, ids)
  t: number;                        // snapshot time
}

const STORE_KEY = 'ctx:ws:v1';
const MAX_VIEWS = 20;
const MAX_DRAFTS = 200;

export class WorkingSetManager {
  private ws: WorkingSetSnapshot = { viewStack: [], drafts: {}, t: Date.now() };
  private ledger: ContextTruthLedger;

  constructor(ledger = new ContextTruthLedger()) {
    this.ledger = ledger;
    this.load().catch(() => {
      // Fail silently on load error
    });
  }

  /** --------- Public API --------- */

  /** Push a new view and record a transition fact into the ledger */
  async pushView(next: Omit<ViewState,'t'>, opts?: { from?: string; latencyMs?: number }) {
    const t = Date.now();
    const view: ViewState = { ...next, t };
    const prev = this.currentView();
    this.ws.viewStack.push(view);
    if (this.ws.viewStack.length > MAX_VIEWS) this.ws.viewStack.shift();
    this.ws.t = t;
    this.persist().catch(() => {
      // Fail silently on persist error
    });

    // Record transition fact (from prev.route → next.route)
    const fact: TransitionFact = {
      kind: 'transition', t,
      data: { from: opts?.from ?? (prev?.route ?? 'unknown'), to: next.route, latencyMs: opts?.latencyMs }
    };
    await this.ledger.append(fact);
  }

  /** Update current view (e.g., scroll/selection) */
  updateView(patch: Partial<Omit<ViewState,'t'>>) {
    const v = this.currentView();
    if (!v) return;
    Object.assign(v, patch);
    v.t = Date.now();
    this.ws.t = v.t;
    this.persist().catch(() => {
      // Fail silently on persist error
    });
  }

  /** Pop view (optionally record a transition) */
  async popView(opts?: { to?: string; latencyMs?: number }) {
    const t = Date.now();
    const prev = this.ws.viewStack.pop();
    this.ws.t = t;
    this.persist().catch(() => {
      // Fail silently on persist error
    });

    const curr = this.currentView();
    if (prev && curr) {
      const fact: TransitionFact = {
        kind: 'transition', t,
        data: { from: prev.route, to: opts?.to ?? curr.route, latencyMs: opts?.latencyMs }
      };
      await this.ledger.append(fact);
    }
  }

  /** Drafts */
  saveDraft(d: Draft) {
    this.ws.drafts[d.id] = { ...d, updatedAt: Date.now() };
    
    // Bound drafts growth
    if (Object.keys(this.ws.drafts).length > MAX_DRAFTS) {
      const oldest = Object.entries(this.ws.drafts)
        .sort((a, b) => a[1].updatedAt - b[1].updatedAt)[0]?.[0];
      if (oldest) delete this.ws.drafts[oldest];
    }
    
    this.ws.t = Date.now();
    this.persist().catch(() => {
      // Fail silently on persist error
    });
  }
  
  removeDraft(id: string) {
    delete this.ws.drafts[id];
    this.ws.t = Date.now();
    this.persist().catch(() => {
      // Fail silently on persist error
    });
  }

  /** Focus management */
  setFocus(f: Focus) {
    this.ws.focus = { ...f, t: Date.now() };
    this.ws.t = this.ws.focus.t;
    this.persist().catch(() => {
      // Fail silently on persist error
    });
  }
  
  clearFocus() {
    this.ws.focus = undefined;
    this.ws.t = Date.now();
    this.persist().catch(() => {
      // Fail silently on persist error
    });
  }

  /** Lightweight references (urls/ids) */
  addReference(ref: string) {
    const list = this.ws.refs ?? (this.ws.refs = []);
    if (!list.includes(ref)) list.push(ref);
    this.ws.t = Date.now();
    this.persist().catch(() => {
      // Fail silently on persist error
    });
  }
  
  removeReference(ref: string) {
    if (!this.ws.refs) return;
    this.ws.refs = this.ws.refs.filter(r => r !== ref);
    this.ws.t = Date.now();
    this.persist().catch(() => {
      // Fail silently on persist error
    });
  }

  /** Append a low-risk note fact to the ledger (for audit/trail) */
  async appendNote(text: string): Promise<ContextFactWithId> {
    const fact: NoteFact = { kind:'note', t: Date.now(), data:{ text } };
    return this.ledger.append(fact);
  }

  /** Snapshot & restore */
  snapshot(): WorkingSetSnapshot {
    return JSON.parse(JSON.stringify(this.ws));
  }
  
  restore(snap: WorkingSetSnapshot) {
    if (!snap || !Array.isArray(snap.viewStack) || !snap.drafts) return;
    this.ws = JSON.parse(JSON.stringify(snap));
    this.persist().catch(() => {
      // Fail silently on persist error
    });
  }

  /** Helpers */
  currentView(): ViewState | undefined {
    return this.ws.viewStack[this.ws.viewStack.length - 1];
  }

  getLedger(): ContextTruthLedger {
    return this.ledger;
  }

  /** --------- Storage --------- */
  private async load() {
    try {
      const raw = await storage.getItem(STORE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as WorkingSetSnapshot;
        if (Array.isArray(parsed.viewStack) && parsed.drafts) this.ws = parsed;
      }
    } catch {}
  }
  
  private async persist() {
    try {
      await storage.setItem(STORE_KEY, JSON.stringify(this.ws));
    } catch {}
  }
}