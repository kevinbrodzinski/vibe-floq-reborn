import * as React from "react";
import { cn } from "@/lib/utils";

interface FieldsetProps extends React.FieldsetHTMLAttributes<HTMLFieldSetElement> {
  legend?: string;
  children: React.ReactNode;
}

const Fieldset = React.forwardRef<HTMLFieldSetElement, FieldsetProps>(
  ({ className, legend, children, ...props }, ref) => {
    return (
      <fieldset
        ref={ref}
        className={cn("space-y-2", className)}
        {...props}
      >
        {legend && (
          <legend className="text-sm font-medium text-foreground mb-3">
            {legend}
          </legend>
        )}
        {children}
      </fieldset>
    );
  }
);

Fieldset.displayName = "Fieldset";

export { Fieldset };