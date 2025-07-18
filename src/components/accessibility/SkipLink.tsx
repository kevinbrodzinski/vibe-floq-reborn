/**
 * "Skip to content" link — place as the first element inside <body>.
 */
export default function SkipLink() {
  return (
    <a
      href="#main-content"
      className="fixed left-4 top-1 z-[1000] -translate-y-14 rounded
                 bg-primary px-3 py-2 text-sm font-medium text-primary-foreground
                 transition-transform focus:translate-y-0"
    >
      Skip to content
    </a>
  );
}