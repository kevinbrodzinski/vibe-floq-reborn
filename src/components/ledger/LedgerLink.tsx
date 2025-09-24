import * as React from 'react';
import { Link, useLocation } from 'react-router-dom';

type LedgerLinkProps = React.ComponentProps<typeof Link>;

export function LedgerLink(props: LedgerLinkProps) {
  const location = useLocation();

  const onClick: React.MouseEventHandler<HTMLAnchorElement> = (e) => {
    // If user's handler prevented navigation, don't mark
    if (e.defaultPrevented) {
      props.onClick && props.onClick(e);
      return;
    }
    // Mark start; router will complete measurement on location change
    (window as any).__nav_t0 = performance.now();
    props.onClick && props.onClick(e);
  };

  return <Link {...props} onClick={onClick} />;
}