import { serve } from 'https://deno.land/x/sift@0.6.0/mod.ts'
import { createClient } from 'npm:@supabase/supabase-js'

const { SUPABASE_URL, SUPABASE_ANON_KEY } = Deno.env.toObject()

// Input validation and sanitization
function validateAndSanitizeMessage(body: string): { isValid: boolean; sanitized?: string; error?: string } {
  if (!body || typeof body !== 'string') {
    return { isValid: false, error: 'Message body is required and must be a string' };
  }

  const trimmed = body.trim();
  if (trimmed.length === 0) {
    return { isValid: false, error: 'Message cannot be empty' };
  }

  if (trimmed.length > 2000) {
    return { isValid: false, error: 'Message too long (max 2000 characters)' };
  }

  // Basic XSS protection - escape HTML entities
  const sanitized = trimmed
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');

  return { isValid: true, sanitized };
}

function validateFloqId(floq_id: unknown): { isValid: boolean; error?: string } {
  if (!floq_id || typeof floq_id !== 'string') {
    return { isValid: false, error: 'floq_id is required and must be a string' };
  }

  // Basic UUID validation
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
  if (!uuidRegex.test(floq_id)) {
    return { isValid: false, error: 'floq_id must be a valid UUID' };
  }

  return { isValid: true };
}

serve(async (req) => {
  // ---------- 1. pre-flight ----------
  if (req.method === 'OPTIONS')
    return new Response(null, { headers: cors() })

  try {
    // ---------- 2. verify jwt ----------
    const jwt = req.headers.get('Authorization')?.replace('Bearer ', '')
    if (!jwt) return resp(401, 'missing bearer')

    const supabase = createClient(SUPABASE_URL!, SUPABASE_ANON_KEY!, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    })

    const { data: user, error: jwtErr } = await supabase.auth.getUser()
    if (jwtErr || !user) return resp(401, 'invalid jwt')

    // ---------- 3. payload validation ----------
    let payload;
    try {
      payload = await req.json();
    } catch (parseError) {
      return resp(400, 'Invalid JSON payload');
    }

    const { floq_id, body } = payload;

    // Validate floq_id
    const floqValidation = validateFloqId(floq_id);
    if (!floqValidation.isValid) {
      return resp(400, floqValidation.error!);
    }

    // Validate and sanitize message body
    const messageValidation = validateAndSanitizeMessage(body);
    if (!messageValidation.isValid) {
      return resp(400, messageValidation.error!);
    }

    // ---------- 4. membership check ----------
    const { count } = await supabase
      .from('floq_participants')
      .select('*', { count: 'exact', head: true })
      .eq('floq_id', floq_id)
      .eq('user_id', user.user.id)

    if ((count ?? 0) === 0) return resp(403, 'not a member')

    // ---------- 5. insert with retry logic ----------
    let retries = 3;
    let lastError;
    
    while (retries > 0) {
      const { data, error } = await supabase
        .from('floq_messages')
        .insert({ 
          floq_id, 
          sender_id: user.user.id, 
          body: messageValidation.sanitized 
        })
        .select()
        .single()

      if (!error) {
        return new Response(JSON.stringify(data), { headers: cors() })
      }

      lastError = error;
      retries--;
      
      // Wait before retry (exponential backoff)
      if (retries > 0) {
        await new Promise(resolve => setTimeout(resolve, (4 - retries) * 1000));
      }
    }

    console.error('Failed to insert message after retries:', lastError);
    return resp(500, 'Failed to send message. Please try again.');

  } catch (error) {
    console.error('Unexpected error in post-floq-message:', error);
    return resp(500, 'Internal server error');
  }
})

function cors() {
  return { 
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS'
  }
}

function resp(status: number, msg: string) {
  return new Response(JSON.stringify({ error: msg }), { 
    status, 
    headers: { ...cors(), 'Content-Type': 'application/json' }
  })
}