import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'
import { corsHeaders } from '../_shared/cors.ts'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { daily_afterglow_id, slug } = await req.json()
    console.log('Rendering OG card for slug:', slug, 'afterglow:', daily_afterglow_id)

    // Fetch the afterglow data
    const { data: afterglow, error: fetchError } = await supabase
      .from('daily_afterglow')
      .select('*')
      .eq('id', daily_afterglow_id)
      .single()

    if (fetchError) {
      console.error('Failed to fetch afterglow:', fetchError)
      throw fetchError
    }

    console.log('Fetched afterglow data for date:', afterglow.date)

    // Generate the OG card HTML content
    const cardHtml = generateOGCardHTML(afterglow)
    
    // For now, we'll create a simple placeholder image until we implement proper HTML to image conversion
    // In a real implementation, you'd use a service like Puppeteer or similar to render HTML to PNG
    
    // Create a simple text-based image data (this is a placeholder)
    const imageData = await generatePlaceholderImage(afterglow)
    
    // Upload to storage
    const fileName = `${slug}.png`
    const { data: uploaded, error: uploadError } = await supabase.storage
      .from('og-cards')
      .upload(fileName, imageData, { 
        contentType: 'image/png', 
        upsert: true 
      })

    if (uploadError) {
      console.error('Failed to upload OG card:', uploadError)
      throw uploadError
    }

    console.log('Uploaded OG card:', uploaded.path)

    // Get the public URL
    const { data: publicUrlData } = supabase.storage
      .from('og-cards')
      .getPublicUrl(fileName)
    
    const ogUrl = publicUrlData.publicUrl

    // Update the share link with the OG image URL
    const { error: updateError } = await supabase
      .from('afterglow_share_links')
      .update({ og_image_url: ogUrl })
      .eq('slug', slug)

    if (updateError) {
      console.error('Failed to update share link with OG URL:', updateError)
      throw updateError
    }

    console.log('Successfully created OG card:', ogUrl)

    return new Response(JSON.stringify({ ok: true, og_image_url: ogUrl }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  } catch (err) {
    console.error('Error rendering OG card:', err)
    return new Response(JSON.stringify({ error: String(err) }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    })
  }
})

function generateOGCardHTML(afterglow: any): string {
  const title = afterglow.ai_summary || 'My Afterglow'
  const date = new Date(afterglow.date).toLocaleDateString()
  const energy = afterglow.energy_score || 0
  const social = afterglow.social_intensity || 0
  
  return `
    <html>
      <head>
        <style>
          body {
            margin: 0;
            padding: 40px;
            width: 1200px;
            height: 630px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            color: white;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            text-align: center;
            box-sizing: border-box;
          }
          .title {
            font-size: 48px;
            font-weight: bold;
            margin-bottom: 20px;
            line-height: 1.2;
            max-width: 1000px;
          }
          .date {
            font-size: 24px;
            opacity: 0.9;
            margin-bottom: 30px;
          }
          .stats {
            display: flex;
            gap: 40px;
            font-size: 20px;
          }
          .stat {
            display: flex;
            flex-direction: column;
            align-items: center;
          }
          .stat-value {
            font-size: 36px;
            font-weight: bold;
            margin-bottom: 5px;
          }
          .logo {
            position: absolute;
            bottom: 40px;
            right: 40px;
            font-size: 24px;
            font-weight: bold;
            opacity: 0.8;
          }
        </style>
      </head>
      <body>
        <div class="title">${title}</div>
        <div class="date">${date}</div>
        <div class="stats">
          <div class="stat">
            <div class="stat-value">${energy}</div>
            <div>Energy</div>
          </div>
          <div class="stat">
            <div class="stat-value">${social}</div>
            <div>Social</div>
          </div>
        </div>
        <div class="logo">✨ Afterglow</div>
      </body>
    </html>
  `
}

async function generatePlaceholderImage(afterglow: any): Promise<Uint8Array> {
  // This is a placeholder implementation
  // In a real implementation, you'd convert the HTML to an image using a proper library
  
  // Create a simple PNG header for a 1200x630 purple image
  const width = 1200
  const height = 630
  
  // This is a very basic placeholder - in practice you'd use a proper HTML-to-image service
  const canvas = new Array(width * height * 4).fill(0)
  
  // Fill with purple gradient-like colors
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 4
      canvas[index] = 102 + (x / width) * 50     // R
      canvas[index + 1] = 126 + (y / height) * 50 // G  
      canvas[index + 2] = 234 + (x / width) * 20  // B
      canvas[index + 3] = 255                     // A
    }
  }
  
  // Convert to basic PNG format (simplified)
  // In reality, you'd use a proper PNG encoder or HTML-to-image service
  return new Uint8Array(canvas)
}