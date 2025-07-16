import { Loader2 } from "lucide-react";

interface LoadingOverlayProps {
  isVisible: boolean;
  message?: string;
  className?: string;
  variant?: "default" | "minimal" | "blur";
}

export const LoadingOverlay = ({
  isVisible,
  message = "Loading...",
  className = "",
  variant = "default"
}: LoadingOverlayProps) => {
  if (!isVisible) return null;

  const getOverlayClasses = () => {
    const baseClasses = "fixed inset-0 z-50 flex items-center justify-center";
    
    switch (variant) {
      case "minimal":
        return `${baseClasses} bg-transparent`;
      case "blur":
        return `${baseClasses} bg-background/80 backdrop-blur-sm`;
      default:
        return `${baseClasses} bg-background/60`;
    }
  };

  const getContentClasses = () => {
    switch (variant) {
      case "minimal":
        return "flex flex-col items-center gap-3 p-6";
      default:
        return "flex flex-col items-center gap-3 p-6 bg-card border border-border rounded-lg shadow-lg";
    }
  };

  return (
    <div className={`${getOverlayClasses()} ${className}`}>
      <div className={getContentClasses()}>
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
        {message && (
          <p className="text-sm text-muted-foreground text-center max-w-xs">
            {message}
          </p>
        )}
      </div>
    </div>
  );
};