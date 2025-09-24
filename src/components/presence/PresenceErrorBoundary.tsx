
import React from 'react';

interface Props {
  children: React.ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class PresenceErrorBoundary extends React.Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    console.warn('[PresenceErrorBoundary] Caught presence error:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.warn('[PresenceErrorBoundary] Presence system error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      // Render children anyway but log the error - don't break the UI
      console.warn('[PresenceErrorBoundary] Rendering fallback, presence disabled');
      return this.props.children;
    }
    return this.props.children;
  }
}
