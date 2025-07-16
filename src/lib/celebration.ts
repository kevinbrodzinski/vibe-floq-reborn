// Celebration effects for plan status changes

const isDev = import.meta.env.MODE === 'development'

export const celebrationEffects = {
  planFinalized: () => {
    if (isDev) console.log('🎉 Plan finalized!')
    // TODO: Add confetti or visual celebration
    // import('canvas-confetti').then(confetti => confetti.default())
  },

  planExecuting: () => {
    if (isDev) console.log('🚀 Plan execution started!')
    // TODO: Add subtle visual feedback
  },

  planCompleted: () => {
    if (isDev) console.log('✅ Plan completed successfully!')
    // TODO: Add major celebration with confetti
    // import('canvas-confetti').then(confetti => confetti.default({ particleCount: 100 }))
  },

  // Generic success celebration
  success: () => {
    if (isDev) console.log('✨ Success!')
  },

  // Generic celebration
  celebrate: () => {
    if (isDev) console.log('🎊 Celebration!')
  }
}