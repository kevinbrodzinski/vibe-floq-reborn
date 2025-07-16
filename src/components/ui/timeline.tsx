import React from "react";
import clsx from "clsx";

/* Basic reusable prop helper */
type CProps = React.HTMLAttributes<HTMLElement>;

export const Timeline: React.FC<CProps> = ({ className, children, ...rest }) => (
  <ol className={clsx("relative border-l border-muted-foreground/20", className)} {...rest}>
    {children}
  </ol>
);

export const TimelineItem: React.FC<CProps> = ({ className, children, ...rest }) => (
  <li className={clsx("mb-8 ml-4", className)} {...rest}>
    {children}
  </li>
);

export const TimelineSeparator: React.FC<CProps> = ({ className, children, ...rest }) => (
  <div className={clsx("flex items-start gap-2", className)} {...rest}>
    {children}
  </div>
);

export const TimelineDot: React.FC<{ color?: string } & CProps> = ({
  color = "#6b7280",
  className,
  ...rest
}) => (
  <span
    className={clsx(
      "block h-3 w-3 rounded-full border-2 border-background shrink-0",
      className
    )}
    style={{ backgroundColor: color }}
    {...rest}
  />
);

export const TimelineConnector: React.FC<CProps> = ({ className, ...rest }) => (
  <span
    className={clsx(
      "ml-[5px] mt-1 h-full border-l border-muted-foreground/20 grow",
      className
    )}
    {...rest}
  />
);

export const TimelineContent: React.FC<CProps> = ({ className, children, ...rest }) => (
  <div className={clsx("pl-4", className)} {...rest}>
    {children}
  </div>
);