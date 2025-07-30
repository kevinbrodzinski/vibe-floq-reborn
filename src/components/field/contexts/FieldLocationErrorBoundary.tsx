import { Component, type ErrorInfo, type ReactNode } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class FieldLocationErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false };

  static getDerivedStateFromError(error: Error): State {
    console.error('[FieldLocationErrorBoundary] Location context error:', error);
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error("[FieldLocationErrorBoundary] Location context crashed:", error, errorInfo);
    this.setState({ error });
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <h3 className="text-lg font-semibold">Location services unavailable</h3>
          <p className="max-w-xs text-sm text-muted-foreground">
            {this.state.error?.message ?? "Something went wrong with location tracking."}
          </p>
          <Button
            size="sm"
            variant="outline"
            onClick={() => window.location.reload()}
          >
            Reload
          </Button>
        </div>
      );
    }
    return this.props.children;
  }
}