import { useState } from "react";
import { CheckCircle, AlertTriangle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface FinalizePlanButtonProps {
  planId: string;
  canFinalize: boolean;
  onFinalize: () => Promise<void>;
  className?: string;
}

export const FinalizePlanButton = ({
  planId,
  canFinalize,
  onFinalize,
  className = ""
}: FinalizePlanButtonProps) => {
  const [isLoading, setIsLoading] = useState(false);

  const handleFinalize = async () => {
    setIsLoading(true);
    try {
      await onFinalize();
    } catch (error) {
      console.error('Failed to finalize plan:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant={canFinalize ? "default" : "secondary"}
          disabled={!canFinalize || isLoading}
          className={className}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Finalizing...
            </>
          ) : (
            <>
              <CheckCircle className="w-4 h-4 mr-2" />
              Finalize Plan
            </>
          )}
        </Button>
      </AlertDialogTrigger>
      
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            {canFinalize ? (
              <CheckCircle className="w-5 h-5 text-green-400" />
            ) : (
              <AlertTriangle className="w-5 h-5 text-yellow-400" />
            )}
            Finalize This Plan?
          </AlertDialogTitle>
          <AlertDialogDescription>
            {canFinalize ? (
              "This will lock the plan and notify all participants. You won't be able to make changes after finalizing."
            ) : (
              "This plan cannot be finalized yet. Make sure all stops have sufficient votes and required details are complete."
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>
        
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          {canFinalize && (
            <AlertDialogAction
              onClick={handleFinalize}
              disabled={isLoading}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Finalizing...
                </>
              ) : (
                "Yes, Finalize Plan"
              )}
            </AlertDialogAction>
          )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};