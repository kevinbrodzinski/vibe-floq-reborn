import { toast } from '@/hooks/use-toast'

export function toastErr(e: unknown, fallback = 'Something went wrong') {
  const m = e && typeof e === 'object' && 'message' in e
      ? (e as any).message
      : fallback;
  toast({
    title: "Error",
    description: m,
    variant: "destructive"
  });
}