import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const url = new URL(req.url)
    const slug = url.pathname.split('/').pop()
    
    if (!slug) {
      return new Response('Share link not found', { 
        status: 404,
        headers: { 'Content-Type': 'text/html' }
      })
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    )

    // Fetch share link data with afterglow details
    const { data, error } = await supabase
      .from('afterglow_share_links')
      .select(`
        slug,
        og_image_url,
        daily_afterglow (
          ai_summary,
          summary_text,
          date,
          energy_score,
          social_intensity,
          dominant_vibe
        )
      `)
      .eq('slug', slug)
      .single()

    if (error || !data) {
      console.error('Share link not found:', error)
      return new Response('Share link not found', { 
        status: 404,
        headers: { 'Content-Type': 'text/html' }
      })
    }

    const ag = data.daily_afterglow
    const date = new Date(ag.date)
    const formattedDate = date.toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })
    
    // Build rich description
    let description = ag.ai_summary || ag.summary_text || 'A day captured in Afterglow'
    if (ag.energy_score || ag.social_intensity) {
      const energy = ag.energy_score ? `Energy: ${ag.energy_score}` : ''
      const social = ag.social_intensity ? `Social: ${ag.social_intensity}` : ''
      const vibe = ag.dominant_vibe ? `Vibe: ${ag.dominant_vibe}` : ''
      const stats = [energy, social, vibe].filter(Boolean).join(' • ')
      if (stats) {
        description = `${description} | ${stats}`
      }
    }
    
    const title = `Afterglow · ${formattedDate}`
    const siteUrl = Deno.env.get('SITE_URL') || `https://${Deno.env.get('SUPABASE_URL')?.replace('https://','').replace('.supabase.co','')}.supabase.co`
    const shareUrl = `${siteUrl}/a/${slug}`
    const img = data.og_image_url || `${siteUrl}/placeholder-og.png`

    // Escape HTML entities
    const escapeHtml = (text: string) => text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>${escapeHtml(title)}</title>

  <!-- Open Graph -->
  <meta property="og:type" content="article" />
  <meta property="og:title" content="${escapeHtml(title)}" />
  <meta property="og:description" content="${escapeHtml(description)}" />
  <meta property="og:image" content="${escapeHtml(img)}" />
  <meta property="og:url" content="${escapeHtml(shareUrl)}" />
  <meta property="og:site_name" content="Afterglow" />

  <!-- Twitter -->
  <meta name="twitter:card" content="summary_large_image" />
  <meta name="twitter:title" content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${escapeHtml(description)}" />
  <meta name="twitter:image" content="${escapeHtml(img)}" />

  <!-- Standard meta -->
  <meta name="description" content="${escapeHtml(description)}" />

  <!-- Redirect for human users -->
  <meta http-equiv="refresh" content="0; url=/#/a/${slug}">
  
  <style>
    html { font: 16px/1.4 system-ui, -apple-system, sans-serif; }
    body { 
      display: flex; 
      align-items: center; 
      justify-content: center; 
      height: 100vh; 
      margin: 0;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
    }
    .loading {
      text-align: center;
      padding: 2rem;
    }
    .spinner {
      width: 32px;
      height: 32px;
      border: 3px solid rgba(255,255,255,0.3);
      border-top: 3px solid white;
      border-radius: 50%;
      animation: spin 1s linear infinite;
      margin: 0 auto 1rem;
    }
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  </style>
</head>
<body>
  <div class="loading">
    <div class="spinner"></div>
    <p>Loading your Afterglow...</p>
    <noscript>
      <p>Please enable JavaScript to view this shared Afterglow.</p>
    </noscript>
  </div>
  
  <script type="module">
    // Redirect JS-enabled browsers to the SPA route
    try {
      window.location.replace('/#/a/${slug}')
    } catch (e) {
      // Fallback for older browsers
      window.location.href = '/#/a/${slug}'
    }
  </script>
</body>
</html>`

    return new Response(html, { 
      headers: { 
        'Content-Type': 'text/html; charset=utf-8',
        'Cache-Control': 'public, max-age=300', // 5 minutes cache
        ...corsHeaders
      } 
    })

  } catch (err) {
    console.error('Error in og-share-page:', err)
    return new Response('Internal Server Error', { 
      status: 500,
      headers: { 'Content-Type': 'text/html' }
    })
  }
})