import { cn } from "@/lib/utils";
import { track } from "@/lib/analytics";

interface LogoProps {
  className?: string;
}

export const Logo = ({ className }: LogoProps) => {
  return (
    <div 
      className={cn("text-primary cursor-pointer", className)}
      onClick={() => {
        track('posthog_test', { 
          source: 'field_header',
          timestamp: new Date().toISOString(),
          test: true
        });
        console.log('PostHog test event sent!');
      }}
    >
      floq
    </div>
  );
};