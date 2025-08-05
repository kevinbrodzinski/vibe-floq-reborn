// Standardized venue sync result interface
export interface VenueSyncResult {
  ok: boolean;
  count: number;
  phase: string;
  error?: string;
  source?: string;
  location?: { lat: number; lng: number };
  keyword?: string;
  errors?: any[];
}