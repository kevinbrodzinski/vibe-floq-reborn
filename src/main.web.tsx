import React, { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";

// Conditional imports for development vs production
if (import.meta.env.DEV) {
  // Development-only diagnostic tools
  import('./lib/debug/consoleGuard');
  import('./lib/debug/coordinateFlowTest');
  import('./lib/debug/environmentHelper');
} else {
  // Production optimizations
  import('./lib/productionOptimizations');
}

// Ensure the app container exists
const container = document.getElementById("root");
if (!container) {
  throw new Error("Root element not found");
}

// React 18 concurrent features
const root = createRoot(container);

// Enhanced error boundary for production
const AppWithErrorBoundary = () => (
  <StrictMode>
    <App />
  </StrictMode>
);

console.log('🚀 MAIN.WEB.TSX - About to render App');
root.render(<AppWithErrorBoundary />);

// Development-only diagnostics
if (import.meta.env.DEV) {
  // Enhanced debugging in development
  import('./lib/debug/mapDiagnostics');
  import('./lib/debug/mapDebugHelpers');
  import('./lib/debug/mapHealthCheck');
}

// Register service worker for PWA features
if ('serviceWorker' in navigator && import.meta.env.PROD) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((registration) => {
        console.log('SW registered: ', registration);
      })
      .catch((registrationError) => {
        console.log('SW registration failed: ', registrationError);
      });
  });
}
