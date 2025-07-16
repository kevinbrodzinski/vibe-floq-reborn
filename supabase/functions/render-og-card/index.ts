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
  // Create a simple PNG image - basic implementation for now
  // TODO: Replace with proper HTML-to-image conversion using Puppeteer/Satori
  
  const width = 1200
  const height = 630
  
  // Create minimal PNG data structure
  const pngSignature = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10])
  
  // IHDR chunk (image header)
  const ihdr = new ArrayBuffer(25)
  const ihdrView = new DataView(ihdr)
  ihdrView.setUint32(0, 13) // length
  ihdrView.setUint32(4, 0x49484452) // "IHDR"
  ihdrView.setUint32(8, width)
  ihdrView.setUint32(12, height)
  ihdrView.setUint8(16, 8) // bit depth
  ihdrView.setUint8(17, 2) // color type (RGB)
  ihdrView.setUint8(18, 0) // compression
  ihdrView.setUint8(19, 0) // filter
  ihdrView.setUint8(20, 0) // interlace
  ihdrView.setUint32(21, 0x22) // CRC placeholder
  
  // Simple gradient RGB data
  const pixelData = new Uint8Array(width * height * 3)
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const index = (y * width + x) * 3
      pixelData[index] = Math.floor(102 + (x / width) * 50)     // R
      pixelData[index + 1] = Math.floor(126 + (y / height) * 50) // G  
      pixelData[index + 2] = Math.floor(234 + (x / width) * 20)  // B
    }
  }
  
  // IDAT chunk (image data) - simplified
  const idat = new ArrayBuffer(pixelData.length + 12)
  const idatView = new DataView(idat)
  idatView.setUint32(0, pixelData.length + 4) // length
  idatView.setUint32(4, 0x49444154) // "IDAT"
  new Uint8Array(idat, 8, pixelData.length).set(pixelData)
  
  // IEND chunk
  const iend = new Uint8Array([0, 0, 0, 0, 73, 69, 78, 68, 174, 66, 96, 130])
  
  // Combine all chunks
  const result = new Uint8Array(pngSignature.length + ihdr.byteLength + idat.byteLength + iend.length)
  let offset = 0
  result.set(pngSignature, offset)
  offset += pngSignature.length
  result.set(new Uint8Array(ihdr), offset)
  offset += ihdr.byteLength
  result.set(new Uint8Array(idat), offset)
  offset += idat.byteLength
  result.set(iend, offset)
  
  return result
}