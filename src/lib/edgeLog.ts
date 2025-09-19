// Lightweight observability for field system

export function edgeLog(event: string, data: Record<string, any>) {
  // Simple implementation - just console log in dev
  if (process.env.NODE_ENV === 'development') {
    console.log(`[Field] ${event}:`, data);
  }
  
  // In production, this could send to analytics service
}