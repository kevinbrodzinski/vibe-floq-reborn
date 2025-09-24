
/**
 * "Skip to content" link — place as the first element inside <body>.
 */
import { zIndex } from '@/constants/z';

export default function SkipLink() {
  return (
    <a
      href="#main-content"
      {...zIndex('system')}
      className="skip-link fixed left-4 top-2 -translate-y-28 rounded
                 bg-primary px-3 py-2 text-sm font-medium text-primary-foreground
                 transition-transform duration-200 ease-out focus:translate-y-0"
    >
      Skip to content
    </a>
  );
}
