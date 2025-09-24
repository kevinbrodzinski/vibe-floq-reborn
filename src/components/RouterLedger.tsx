import { useLedgerReactRouter } from '@/lib/ledger/router/useLedgerReactRouter';

/**
 * Component wrapper for the router ledger hook
 * Must be rendered inside BrowserRouter to access Router context
 */
export function RouterLedger() {
  useLedgerReactRouter();
  return null;
}