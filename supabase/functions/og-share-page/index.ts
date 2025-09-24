import { serve } from 'https://deno.land/x/sift@0.6.0/mod.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

/* ---------- tiny helpers ---------- */
const escapeHtml = (txt = '') =>
  txt
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const toDate = (iso: string) =>
  new Date(iso).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })

/* ---------- Edge function ---------- */
serve(async (req) => {
  if (req.method === 'OPTIONS')
    return new Response(null, { headers: corsHeaders })

  try {
    /* 1. Parse & validate slug */
    const match = new URL(req.url).pathname.match(/^\/a\/([A-Z0-9]{8})\/?$/i)
    if (!match) {
      return new Response('Not found', { status: 404 })
    }
    const slug = match[1]

    /* 2. Fetch share-link row (+ afterglow) */
    const { data, error } = await supabase
      .from('afterglow_share_links')
      .select(
        `og_image_url,
         daily_afterglow (
           ai_summary,
           summary_text,
           date,
           energy_score,
           social_intensity,
           dominant_vibe
         )`
      )
      .eq('slug', slug)
      .single()

    if (error || !data) return new Response('Not found', { status: 404 })

    const ag = data.daily_afterglow
    const title = `Afterglow · ${toDate(ag.date)}`
    const description =
      escapeHtml(
        ag.ai_summary ||
          ag.summary_text ||
          'A day captured in Afterglow – see the vibe, energy & memories.'
      ) +
      escapeHtml(
        [
          ag.energy_score ? `Energy ${ag.energy_score}` : '',
          ag.social_intensity ? `Social ${ag.social_intensity}` : '',
          ag.dominant_vibe ? ag.dominant_vibe : '',
        ]
          .filter(Boolean)
          .join(' • ')
          ? ` | ${[
              ag.energy_score ? `Energy ${ag.energy_score}` : '',
              ag.social_intensity ? `Social ${ag.social_intensity}` : '',
              ag.dominant_vibe ? ag.dominant_vibe : '',
            ]
              .filter(Boolean)
              .join(' • ')}`
          : ''
      )

    const siteUrl =
      Deno.env.get('SITE_URL')?.replace(/\/+$/, '') || 'https://lovable.app'
    const shareUrl = `${siteUrl}/a/${slug}`
    const ogImg = data.og_image_url || `${siteUrl}/placeholder-og.png`

    /* 3. HTML with OG meta + JS redirect  */
    const html = /*html*/ `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>

  <!-- Open Graph -->
  <meta property="og:type"        content="website" />
  <meta property="og:title"       content="${escapeHtml(title)}" />
  <meta property="og:description" content="${description}" />
  <meta property="og:url"         content="${shareUrl}" />
  <meta property="og:image"       content="${ogImg}" />

  <!-- Twitter -->
  <meta name="twitter:card"        content="summary_large_image" />
  <meta name="twitter:title"       content="${escapeHtml(title)}" />
  <meta name="twitter:description" content="${description}" />
  <meta name="twitter:image"       content="${ogImg}" />

  <meta http-equiv="refresh" content="0;url=${shareUrl}#/a/${slug}" />
  <style>
    html,body{margin:0;height:100%;display:grid;place-items:center;
      background:linear-gradient(135deg,#667eea 0%,#764ba2 100%);
      color:#fff;font:16px/1.4 system-ui,-apple-system,sans-serif}
    .spinner{width:32px;height:32px;border:3px solid rgba(255,255,255,.3);
      border-top:3px solid #fff;border-radius:50%;animation:spin 1s linear infinite;margin:0 auto 1rem}
    @keyframes spin{to{transform:rotate(360deg)}}
  </style>
</head>

<body>
  <noscript>
    <p>Please enable JavaScript to view this shared Afterglow.</p>
  </noscript>
  <div class="loading" id="js">
    <div class="spinner"></div>
    Loading your Afterglow…
  </div>

  <script>
    window.location.replace('${shareUrl}#/a/${slug}');
  </script>
</body>
</html>`

    return new Response(html, {
      headers: {
        'Content-Type': 'text/html; charset=UTF-8',
        'Cache-Control': 'public, max-age=300',
        ...corsHeaders,
      },
    })
  } catch (err) {
    console.error(err)
    return new Response('Internal error', { status: 500 })
  }
})