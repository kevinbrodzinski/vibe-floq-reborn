// Celebration effects for plan status changes

export const celebrationEffects = {
  planFinalized: () => {
    // Simple confetti or animation for finalized plans
    console.log('🎉 Plan finalized!')
    // Could integrate with confetti library here
  },

  planExecuting: () => {
    // Subtle celebration for execution start
    console.log('🚀 Plan execution started!')
    // Could add visual feedback here
  },

  planCompleted: () => {
    // Major celebration for completion
    console.log('✅ Plan completed successfully!')
    // Could add confetti or achievement unlock here
  },

  // Generic success celebration
  success: () => {
    console.log('✨ Success!')
  },

  // Generic celebration
  celebrate: () => {
    console.log('🎊 Celebration!')
  }
}