/**
 * Aurora Background - Animated liquid gradient orbs
 * Creates the "living, breathing" onboarding aesthetic
 */
export function AuroraBackground() {
  return (
    <div className="fixed inset-0 -z-10 overflow-hidden bg-background">
      {/* Gradient orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-purple-500/30 rounded-full blur-3xl animate-aurora-1" />
      <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-blue-500/20 rounded-full blur-3xl animate-aurora-2" />
      <div className="absolute bottom-1/4 left-1/3 w-72 h-72 bg-indigo-500/25 rounded-full blur-3xl animate-aurora-3" />
      
      {/* Overlay gradient for depth */}
      <div className="absolute inset-0 bg-gradient-to-br from-background/80 via-background/50 to-background/80" />
    </div>
  );
}
