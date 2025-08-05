export interface LogContext {
  function_name: string;
  user_id?: string;
  duration_ms?: number;
  error?: string;
  metadata?: Record<string, any>;
}

export const logger = {
  info: (message: string, context?: LogContext) => {
    console.log(JSON.stringify({
      level: 'info',
      message,
      timestamp: new Date().toISOString(),
      ...context
    }));
  },
  
  error: (message: string, error: Error, context?: LogContext) => {
    console.error(JSON.stringify({
      level: 'error',
      message,
      error: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      ...context
    }));
  },
  
  warn: (message: string, context?: LogContext) => {
    console.warn(JSON.stringify({
      level: 'warn',
      message,
      timestamp: new Date().toISOString(),
      ...context
    }));
  }
};