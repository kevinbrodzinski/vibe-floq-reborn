// Stub toast system to prevent infinite loops
export function useToast() {
  return {
    toasts: [],
    toast: (props?: any) => {
      console.log('Toast:', props?.title || props?.description || 'Toast triggered');
      return { id: 'stub', dismiss: () => {}, update: () => {} };
    },
    dismiss: () => {},
  }
}

export function toast(props?: any) {
  console.log('Toast:', props?.title || props?.description || 'Toast triggered');
  return { id: 'stub', dismiss: () => {}, update: () => {} };
}
