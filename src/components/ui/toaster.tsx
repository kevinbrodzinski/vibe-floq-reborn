import React from "react"
import { useToast } from "@/hooks/use-toast"
import {
  Toast,
  ToastClose,
  ToastDescription,
  ToastProvider,
  ToastTitle,
  ToastViewport,
} from "@/components/ui/toast"

// Memoize individual toast component to prevent unnecessary re-renders
const ToastItem = React.memo(function ToastItem({ 
  id, 
  title, 
  description, 
  action, 
  ...props 
}: any) {
  return (
    <Toast key={id} {...props}>
      <div className="grid gap-1">
        {title && <ToastTitle>{title}</ToastTitle>}
        {description && (
          <ToastDescription>{description}</ToastDescription>
        )}
      </div>
      {action}
      <ToastClose />
    </Toast>
  )
})

export function Toaster() {
  const { toasts } = useToast()

  // Memoize the toast list to prevent recreation on every render
  const toastList = React.useMemo(() => {
    return toasts.map((toast) => (
      <ToastItem key={toast.id} {...toast} />
    ))
  }, [toasts])

  return (
    <ToastProvider>
      {toastList}
      <ToastViewport />
    </ToastProvider>
  )
}
