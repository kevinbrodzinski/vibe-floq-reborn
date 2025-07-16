// Simple confetti effect using CSS animations
export function triggerConfetti(duration: number = 3000) {
  // Guard for non-browser environments
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  
  const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#ffa726', '#66bb6a', '#ab47bc']
  
  for (let i = 0; i < 50; i++) {
    createConfettiPiece(colors[Math.floor(Math.random() * colors.length)])
  }
  
  // Clean up after animation with debounced cleanup
  setTimeout(() => {
    const pieces = document.querySelectorAll('.confetti-piece')
    pieces.forEach(piece => piece.remove())
  }, duration)
}

function createConfettiPiece(color: string) {
  const confetti = document.createElement('div')
  confetti.className = 'confetti-piece'
  confetti.style.cssText = `
    position: fixed;
    width: 10px;
    height: 10px;
    background: ${color};
    border-radius: 50%;
    pointer-events: none;
    z-index: 9999;
    left: ${Math.random() * 100}vw;
    top: -10px;
    animation: confetti-fall ${3 + Math.random() * 2}s linear forwards;
    transform: rotate(${Math.random() * 360}deg);
  `
  
  document.body.appendChild(confetti)
}

// Add CSS animation if not already present
if (typeof document !== 'undefined' && !document.querySelector('#confetti-styles')) {
  const style = document.createElement('style')
  style.id = 'confetti-styles'
  style.textContent = `
    @keyframes confetti-fall {
      to {
        transform: translateY(100vh) rotate(720deg);
        opacity: 0;
      }
    }
  `
  document.head.appendChild(style)
}