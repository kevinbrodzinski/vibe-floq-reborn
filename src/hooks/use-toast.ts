// Stub toast system to prevent infinite loops
export function useToast() {
  return {
    toasts: [],
    toast: () => ({ id: 'stub', dismiss: () => {}, update: () => {} }),
    dismiss: () => {},
  }
}

export function toast() {
  return { id: 'stub', dismiss: () => {}, update: () => {} }
}
