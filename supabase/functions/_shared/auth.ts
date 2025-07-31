/**
 * Standardized authentication utilities for edge functions
 */

export interface AuthContext {
  user: {
    id: string;
    email?: string;
  };
  isAuthenticated: boolean;
}

/**
 * Standard CORS headers for edge functions
 */
export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

/**
 * Handle CORS preflight requests
 */
export function handleCors(req: Request): Response | null {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }
  return null;
}

/**
 * Extract and validate authentication from request
 */
export async function validateAuth(req: Request, supabase: any): Promise<AuthContext> {
  const authHeader = req.headers.get('authorization');
  
  if (!authHeader) {
    throw new Error('Missing authorization header');
  }

  if (!authHeader.startsWith('Bearer ')) {
    throw new Error('Invalid authorization format');
  }

  const { data: { user }, error } = await supabase.auth.getUser();
  
  if (error || !user) {
    throw new Error('Invalid or expired token');
  }

  return {
    user: {
      id: user.id,
      email: user.email,
    },
    isAuthenticated: true,
  };
}

/**
 * Create standardized error response
 */
export function createErrorResponse(
  message: string, 
  status = 400, 
  details?: any
): Response {
  return new Response(
    JSON.stringify({ 
      error: message, 
      details,
      timestamp: new Date().toISOString()
    }), 
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Create standardized success response
 */
export function createSuccessResponse(data?: any, status = 200): Response {
  return new Response(
    data ? JSON.stringify(data) : null, 
    {
      status,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    }
  );
}

/**
 * Rate limiting for edge functions
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string, 
  maxRequests = 60, 
  windowMinutes = 1
): boolean {
  const now = Date.now();
  const windowMs = windowMinutes * 60 * 1000;
  const key = identifier;
  
  const current = rateLimitStore.get(key);
  
  if (!current || now > current.resetTime) {
    // Clean up expired entry and create new one
    rateLimitStore.delete(key);
    rateLimitStore.set(key, { count: 1, resetTime: now + windowMs });
    return true;
  }
  
  if (current.count >= maxRequests) {
    return false; // Rate limit exceeded
  }
  
  current.count++;
  return true;
}

/**
 * Validate request payload structure
 */
export function validatePayload<T>(
  payload: any, 
  requiredFields: (keyof T)[]
): T {
  if (!payload || typeof payload !== 'object') {
    throw new Error('Invalid request payload');
  }
  
  for (const field of requiredFields) {
    if (!Object.hasOwn(payload, field) || payload[field] == null) {
      throw new Error(`Missing required field: ${String(field)}`);
    }
  }
  
  return payload as T;
}

/**
 * Security headers for edge function responses
 */
export const securityHeaders = {
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'X-XSS-Protection': '1; mode=block',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'Permissions-Policy': 'geolocation=()',
};

/**
 * Create Supabase client with request context
 */
export async function createAuthenticatedClient(req: Request, supabaseUrl: string, supabaseKey: string) {
  const { createClient } = await import('https://esm.sh/@supabase/supabase-js@2');
  
  return createClient(supabaseUrl, supabaseKey, {
    global: {
      headers: {
        Authorization: req.headers.get('Authorization') ?? '',
      },
    },
  });
}