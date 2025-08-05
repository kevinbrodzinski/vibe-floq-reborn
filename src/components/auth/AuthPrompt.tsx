import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { LogIn, UserPlus, X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { zIndex } from '@/constants/z'

interface AuthPromptProps {
  title?: string
  description?: string
  actionText?: string
  onSignIn?: () => void
  onSignUp?: () => void
  onDismiss?: () => void
  showDismiss?: boolean
  variant?: 'inline' | 'floating' | 'modal'
  className?: string
}

export function AuthPrompt({
  title = "Join the conversation",
  description = "Sign in to vote, comment, and participate in planning",
  actionText = "Get started",
  onSignIn,
  onSignUp,
  onDismiss,
  showDismiss = true,
  variant = 'inline',
  className
}: AuthPromptProps) {
  const [isVisible, setIsVisible] = useState(true)

  const handleDismiss = () => {
    setIsVisible(false)
    onDismiss?.()
  }

  if (!isVisible) return null

  const content = (
    <div className="space-y-3">
      {showDismiss && variant === 'floating' && (
        <div className="flex justify-end">
          <Button
            variant="ghost"
            size="sm"
            onClick={handleDismiss}
            className="h-6 w-6 p-0"
          >
            <X className="w-3 h-3" />
          </Button>
        </div>
      )}
      
      <div className="text-center space-y-2">
        <h3 className="font-medium text-sm">{title}</h3>
        <p className="text-xs text-muted-foreground">{description}</p>
      </div>

      <div className="flex gap-2">
        {onSignIn && (
          <Button
            variant="outline"
            size="sm"
            onClick={onSignIn}
            className="flex-1 gap-2"
          >
            <LogIn className="w-3 h-3" />
            Sign In
          </Button>
        )}
        {onSignUp && (
          <Button
            size="sm"
            onClick={onSignUp}
            className="flex-1 gap-2"
          >
            <UserPlus className="w-3 h-3" />
            {actionText}
          </Button>
        )}
      </div>

      {variant === 'inline' && (
        <div className="text-center">
          <Badge variant="secondary" className="text-xs">
            Guest mode: Limited features
          </Badge>
        </div>
      )}
    </div>
  )

  if (variant === 'floating') {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0, y: 20, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 20, scale: 0.95 }}
          {...zIndex('toast')}
          className={cn(
            "fixed bottom-4 right-4 max-w-sm",
            className
          )}
        >
          <Card className="shadow-lg border-2 border-primary/20">
            <CardContent className="p-4">
              {content}
            </CardContent>
          </Card>
        </motion.div>
      </AnimatePresence>
    )
  }

  if (variant === 'modal') {
    return (
      <AnimatePresence>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          {...zIndex('modal')} className="fixed inset-0 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className={cn("w-full max-w-sm p-4", className)}
          >
            <Card>
              <CardContent className="p-6">
                {content}
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </AnimatePresence>
    )
  }

  return (
    <Card className={cn("w-full", className)}>
      <CardContent className="p-4">
        {content}
      </CardContent>
    </Card>
  )
}