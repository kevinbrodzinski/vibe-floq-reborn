
// ✅ AppContainer.tsx — Refactored with AppAccessGuard

import { AppAccessGuard } from '@/components/auth/AppAccessGuard';
import { FloqApp } from '@/components/FloqApp';

export function AppContainer() {
  console.log('🏠 AppContainer CALLED - Component is mounting');
  
  return (
    <AppAccessGuard>
      <FloqApp />
    </AppAccessGuard>
  );
}
