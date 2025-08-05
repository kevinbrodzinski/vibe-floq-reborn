// Enhanced confetti effect with multiple celebration levels
export interface ConfettiOptions {
  duration?: number
  intensity?: 'low' | 'medium' | 'high' | 'celebration'
  colors?: string[]
  shapes?: ('circle' | 'square' | 'triangle')[]
}

export function triggerConfetti(duration: number = 3000, options: ConfettiOptions = {}) {
  // Guard for non-browser environments (React Native compatibility)
  if (typeof window === 'undefined' || typeof document === 'undefined') return
  
  const {
    intensity = 'medium',
    colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#ffa726', '#66bb6a', '#ab47bc'],
    shapes = ['circle']
  } = options

  const intensitySettings = {
    low: { count: 20, spreadTime: 100 },
    medium: { count: 50, spreadTime: 200 },
    high: { count: 100, spreadTime: 300 },
    celebration: { count: 150, spreadTime: 500 }
  }

  const settings = intensitySettings[intensity]
  
  // Create confetti in bursts for better visual effect
  for (let burst = 0; burst < 3; burst++) {
    setTimeout(() => {
      for (let i = 0; i < settings.count / 3; i++) {
        createConfettiPiece(
          colors[Math.floor(Math.random() * colors.length)],
          shapes[Math.floor(Math.random() * shapes.length)]
        )
      }
    }, burst * settings.spreadTime)
  }
  
  // Clean up after animation with debounced cleanup and limit pieces
  setTimeout(() => {
    const pieces = document.querySelectorAll('.confetti-piece')
    // Limit max pieces to prevent memory leaks
    if (pieces.length > 200) {
      pieces.forEach(piece => piece.remove())
    } else {
      pieces.forEach(piece => piece.remove())
    }
  }, duration)
}

// Specialized celebration functions
export const celebrationEffects = {
  planFinalized: () => triggerConfetti(2500, { intensity: 'medium', colors: ['#45b7d1', '#4ecdc4'] }),
  planExecuting: () => triggerConfetti(3000, { intensity: 'high', colors: ['#ffa726', '#ff6b6b'] }),
  planCompleted: () => triggerConfetti(4500, { intensity: 'celebration' }),
  milestone: () => triggerConfetti(2000, { intensity: 'low', colors: ['#66bb6a'] })
}

function createConfettiPiece(color: string, shape: 'circle' | 'square' | 'triangle' = 'circle') {
  const confetti = document.createElement('div')
  confetti.className = 'confetti-piece'
  
  const size = 8 + Math.random() * 6 // Random size between 8-14px
  const fallDuration = 3 + Math.random() * 3 // Random duration 3-6s
  const rotationSpeed = 180 + Math.random() * 360 // Random rotation speed
  
  let shapeStyles = ''
  switch (shape) {
    case 'circle':
      shapeStyles = 'border-radius: 50%;'
      break
    case 'square':
      shapeStyles = 'border-radius: 2px;'
      break
    case 'triangle':
      shapeStyles = `
        width: 0; 
        height: 0; 
        border-left: ${size/2}px solid transparent;
        border-right: ${size/2}px solid transparent;
        border-bottom: ${size}px solid ${color};
        background: transparent;
      `
      break
  }
  
  confetti.style.cssText = `
    position: fixed;
    width: ${shape === 'triangle' ? '0' : size + 'px'};
    height: ${shape === 'triangle' ? '0' : size + 'px'};
    background: ${shape === 'triangle' ? 'transparent' : color};
    ${shapeStyles}
    pointer-events: none;
    z-index: 9999;
    left: ${Math.random() * 100}vw;
    top: -20px;
    animation: confetti-fall ${fallDuration}s linear forwards;
    transform: rotate(${Math.random() * 360}deg);
    opacity: ${0.7 + Math.random() * 0.3};
  `
  
  document.body.appendChild(confetti)
}

// Add enhanced CSS animations if not already present
if (typeof document !== 'undefined' && !document.querySelector('#confetti-styles')) {
  const style = document.createElement('style')
  style.id = 'confetti-styles'
  style.textContent = `
    @keyframes confetti-fall {
      0% {
        transform: translateY(-20px) rotate(0deg) scale(1);
        opacity: 1;
      }
      10% {
        opacity: 1;
      }
      90% {
        opacity: 0.8;
      }
      100% {
        transform: translateY(100vh) rotate(720deg) scale(0.8);
        opacity: 0;
      }
    }
    
    .confetti-piece {
      animation-timing-function: cubic-bezier(0.25, 0.46, 0.45, 0.94);
    }
  `
  document.head.appendChild(style)
}