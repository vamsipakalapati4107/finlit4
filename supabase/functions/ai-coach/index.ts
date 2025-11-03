import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-api-version, x-supabase-authorization, x-requested-with',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Max-Age': '86400',
  'Vary': 'Origin',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    const reqHeaders = req.headers.get('Access-Control-Request-Headers') || corsHeaders['Access-Control-Allow-Headers'];
    const dynamic = { ...corsHeaders, 'Access-Control-Allow-Headers': reqHeaders } as Record<string, string>;
    return new Response(null, { headers: dynamic });
  }

  try {
    const { message, userProfile, expenses } = await req.json();
    if (!message || typeof message !== 'string') {
      return new Response(JSON.stringify({ error: 'Invalid request: message is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    const systemPrompt = `You are a professional financial coach. Provide personalized, actionable advice based on the user's financial situation. Be encouraging, specific, and practical. User profile: ${JSON.stringify(userProfile)}. Recent expenses: ${JSON.stringify(expenses)}`;

    if (!GOOGLE_API_KEY && !LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'No AI provider configured. Set GOOGLE_API_KEY (preferred) or LOVABLE_API_KEY.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    let advice: string | undefined;
    if (GOOGLE_API_KEY) {
      // Direct Google Gemini API
      const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
      const payload = {
        contents: [
          {
            role: 'user',
            parts: [
              { text: `${systemPrompt}\n\nUser: ${message}` }
            ]
          }
        ]
      };
      const response = await fetch(`${endpoint}?key=${GOOGLE_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!response.ok) {
        const errorText = await response.text();
        console.error('Gemini error:', response.status, errorText);
        return new Response(JSON.stringify({ error: 'AI service error' }), {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }
      const data = await response.json();
      advice = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
    } else if (LOVABLE_API_KEY) {
      // Lovable gateway to Gemini
      const response = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: systemPrompt },
            { role: 'user', content: message }
          ],
        }),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('AI gateway error:', response.status, errorText);
        return new Response(JSON.stringify({ error: 'AI service error' }), {
          status: response.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      const data = await response.json();
      advice = data?.choices?.[0]?.message?.content ?? '';
    }

    return new Response(JSON.stringify({ advice }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('Error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
