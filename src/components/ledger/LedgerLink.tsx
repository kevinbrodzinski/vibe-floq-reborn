import * as React from 'react';
import { Link, LinkProps } from 'react-router-dom';

export function LedgerLink(props: LinkProps & { onEmit?: () => void }) {
  const { onEmit, onClick, ...rest } = props;

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    (window as any).__nav_t0 = performance.now(); // for latency
    onEmit?.();
    onClick?.(e);
  };

  return <Link {...rest} onClick={handleClick} />;
}