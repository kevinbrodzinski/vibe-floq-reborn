import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const openAIApiKey = Deno.env.get('OPENAI_API_KEY');

const functionSchema = {
  name: 'create_stop',
  description: 'Extract plan stop information from voice input',
  parameters: {
    type: 'object',
    properties: {
      title: { 
        type: 'string', 
        description: 'Short venue or activity name (e.g., "Coffee shop", "Museum", "Lunch at Mario\'s")' 
      },
      startTime: {
        type: 'string',
        pattern: '^\\d{2}:\\d{2}$',
        description: 'Start time in 24-hour format HH:MM (e.g., "14:30" for 2:30pm)'
      },
      endTime: {
        type: 'string',
        pattern: '^\\d{2}:\\d{2}$',
        description: 'Optional end time in 24-hour format HH:MM'
      },
      venue: { 
        type: 'string',
        description: 'Venue or location name if mentioned'
      },
      description: {
        type: 'string',
        description: 'Any additional details mentioned'
      }
    },
    required: ['title', 'startTime'],
  },
} as const

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    if (!openAIApiKey) {
      throw new Error('OpenAI API key not configured');
    }

    const { transcript, planDate } = await req.json();

    if (!transcript) {
      throw new Error('Transcript is required');
    }

    // Rate limiting check (server-side)
    // TODO: Implement check_rate_limit RPC when needed

    console.log('Parsing voice input:', transcript);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openAIApiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        temperature: 0.2,
        messages: [
          {
            role: 'system',
            content: `You are a voice assistant for a social planning app. Extract plan stop information from user voice input.

The plan date is ${planDate}. When users mention times:
- Convert to 24-hour format (e.g., "2pm" → "14:00", "9am" → "09:00")
- If no AM/PM specified, use context (e.g., "breakfast at 9" → "09:00", "dinner at 7" → "19:00")
- Default duration is 1 hour if no end time mentioned

Common patterns:
- "Add [venue] at [time]"
- "Go to [place] at [time]"
- "Visit [location] from [start] to [end]"
- "[Activity] at [time]"

Be liberal in interpretation but conservative in assumptions.`,
          },
          { role: 'user', content: transcript }
        ],
        tools: [{ type: 'function', function: functionSchema }],
        tool_choice: { type: 'function', function: { name: 'create_stop' } },
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenAI API error:', errorText);
      throw new Error(`OpenAI API error: ${response.status}`);
    }

    const data = await response.json();
    const toolCall = data.choices?.[0]?.message?.tool_calls?.[0];
    
    if (!toolCall) {
      throw new Error('No function call returned from OpenAI');
    }

    const args = JSON.parse(toolCall.function.arguments);

    const parsed = {
      title: args.title,
      startTime: args.startTime,
      endTime: args.endTime,
      venue: args.venue,
      description: args.description,
    };

    console.log('Parsed result:', parsed);

    return new Response(JSON.stringify({ 
      success: true, 
      parsed,
      originalTranscript: transcript 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in parse-voice-to-stop function:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      error: error.message 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});