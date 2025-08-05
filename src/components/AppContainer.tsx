
// ✅ AppContainer.tsx — Refactored with AppAccessGuard

import { AppAccessGuard } from '@/components/auth/AppAccessGuard';
import { FloqApp } from '@/components/FloqApp';

export function AppContainer() {
  return (
    <AppAccessGuard>
      <FloqApp />
    </AppAccessGuard>
  );
}
