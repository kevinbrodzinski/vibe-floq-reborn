import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import { DebugProvider } from '@/lib/useDebug';

createRoot(document.getElementById("root")!).render(
  <DebugProvider>
    <App />
  </DebugProvider>
);
