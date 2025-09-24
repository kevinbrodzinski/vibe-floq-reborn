import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
  onClose?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class VenueModalErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    // Handle ResizeObserver and animation-related errors gracefully
    if (error.message?.includes('_cancelResize') || 
        error.message?.includes('ResizeObserver') ||
        error.message?.includes('framer-motion')) {
      console.warn('[VenueModal] Animation error caught:', error.message);
    }
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[VenueModal] Modal crashed:", error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-background/80 backdrop-blur-sm">
          <div className="flex max-w-sm flex-col items-center gap-4 rounded-lg border bg-card p-6 text-center shadow-lg">
            <AlertTriangle className="h-8 w-8 text-destructive" />
            <h3 className="text-lg font-semibold">Unable to load venue details</h3>
            <p className="text-sm text-muted-foreground">
              Something went wrong while opening the venue modal.
            </p>
            <Button
              size="sm"
              onClick={this.props.onClose}
              className="w-full"
            >
              Close
            </Button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}