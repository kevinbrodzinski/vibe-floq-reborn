import "https://deno.land/x/xhr@0.1.0/mod.ts"
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

interface VoiceToStopRequest {
  audio: string; // base64 encoded audio
  planContext?: string;
}

interface VoiceToStopResponse {
  success: boolean;
  suggestion?: {
    title: string;
    description?: string;
    estimatedDuration?: number;
    estimatedCost?: number;
  };
  error?: string;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { audio, planContext = '' }: VoiceToStopRequest = await req.json()
    
    if (!audio) {
      throw new Error('No audio data provided')
    }

    const openAIApiKey = Deno.env.get('OPENAI_API_KEY')
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured')
    }

    // Create AbortController for 5s timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    try {
      // Step 1: Convert audio to text using Whisper
      const audioBuffer = Uint8Array.from(atob(audio), c => c.charCodeAt(0))
      const audioBlob = new Blob([audioBuffer], { type: 'audio/webm' })
      
      const transcriptionFormData = new FormData()
      transcriptionFormData.append('file', audioBlob, 'audio.webm')
      transcriptionFormData.append('model', 'whisper-1')

      const transcriptionResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
        },
        body: transcriptionFormData,
        signal: controller.signal,
      })

      if (!transcriptionResponse.ok) {
        throw new Error(`Transcription failed: ${await transcriptionResponse.text()}`)
      }

      const transcriptionResult = await transcriptionResponse.json()
      const transcribedText = transcriptionResult.text

      if (!transcribedText || transcribedText.trim().length === 0) {
        throw new Error('No speech detected in audio')
      }

      // Step 2: Parse the transcribed text into a structured stop suggestion
      const parseResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${openAIApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are a helpful assistant that converts voice input into structured plan stops. 
              
Parse the user's voice input and extract:
- title: A concise, actionable title for the stop
- description: Optional additional details 
- estimatedDuration: Duration in minutes (optional)
- estimatedCost: Estimated cost per person in dollars (optional)

Context about the current plan: ${planContext}

Respond with valid JSON in this format:
{
  "title": "Stop title",
  "description": "Optional description", 
  "estimatedDuration": 60,
  "estimatedCost": 25
}

If the input doesn't seem like a valid plan stop, respond with:
{"error": "Could not parse a valid plan stop from the input"}`
            },
            {
              role: 'user',
              content: transcribedText
            }
          ],
          temperature: 0.3,
        }),
        signal: controller.signal,
      })

      clearTimeout(timeoutId)

      if (!parseResponse.ok) {
        throw new Error(`OpenAI parsing failed: ${await parseResponse.text()}`)
      }

      const parseResult = await parseResponse.json()
      const parsedContent = parseResult.choices[0].message.content

      try {
        const suggestion = JSON.parse(parsedContent)
        
        if (suggestion.error) {
          return new Response(
            JSON.stringify({ 
              success: false, 
              error: suggestion.error 
            } as VoiceToStopResponse),
            { 
              headers: { ...corsHeaders, 'Content-Type': 'application/json' },
              status: 400 
            }
          )
        }

        return new Response(
          JSON.stringify({ 
            success: true, 
            suggestion: {
              title: suggestion.title,
              description: suggestion.description,
              estimatedDuration: suggestion.estimatedDuration,
              estimatedCost: suggestion.estimatedCost,
            }
          } as VoiceToStopResponse),
          { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        )

      } catch (jsonError) {
        console.error('Failed to parse OpenAI response as JSON:', parsedContent)
        throw new Error('Invalid response format from AI')
      }

    } catch (error) {
      clearTimeout(timeoutId)
      
      if (error.name === 'AbortError') {
        return new Response(
          JSON.stringify({ 
            success: false, 
            error: 'Request timed out - please try again' 
          } as VoiceToStopResponse),
          { 
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 504 
          }
        )
      }
      throw error
    }

  } catch (error) {
    console.error('Error in parse-voice-to-stop function:', error)
    return new Response(
      JSON.stringify({ 
        success: false, 
        error: error.message || 'An unexpected error occurred' 
      } as VoiceToStopResponse),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    )
  }
})