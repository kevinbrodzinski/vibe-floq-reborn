import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { DebugProvider } from '@/lib/useDebug';
import { initPerformanceMonitoring } from './lib/performance';

// Initialize performance monitoring
initPerformanceMonitoring();

createRoot(document.getElementById("root")!).render(
  <DebugProvider>
    <App />
  </DebugProvider>
);
