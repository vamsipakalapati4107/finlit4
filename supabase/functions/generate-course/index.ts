import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-supabase-api-version, x-supabase-authorization, x-requested-with',
  'Access-Control-Allow-Methods': 'POST, OPTIONS, GET',
  'Access-Control-Max-Age': '86400',
  'Vary': 'Origin',
};

type GenLesson = {
  title: string;
  content: string;
  estimated_minutes: number;
  xp_reward: number;
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    const reqHeaders = req.headers.get('Access-Control-Request-Headers') || corsHeaders['Access-Control-Allow-Headers'];
    const dynamic = { ...corsHeaders, 'Access-Control-Allow-Headers': reqHeaders } as Record<string, string>;
    return new Response(null, { headers: dynamic });
  }

  try {
    const { courseId, titleHint } = await req.json();
    if (!courseId) {
      return new Response(JSON.stringify({ error: 'courseId is required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const GOOGLE_API_KEY = Deno.env.get('GOOGLE_API_KEY');
    const LOVABLE_API_KEY = Deno.env.get('LOVABLE_API_KEY');

    const prompt = `Create a concise financial literacy course with 6 lessons for beginners.
Return strict JSON with fields: {
  "course": {"title": string, "description": string, "difficulty": "Beginner"|"Intermediate"|"Advanced", "estimated_hours": number, "icon": string},
  "lessons": Array<{"title": string, "content": string, "estimated_minutes": number, "xp_reward": number}>
}
Focus on practical, Indian context friendly examples where relevant. Title hint: ${titleHint ?? 'Financial Literacy 101'}.`;

    if (!GOOGLE_API_KEY && !LOVABLE_API_KEY) {
      return new Response(JSON.stringify({ error: 'No AI provider configured. Set GOOGLE_API_KEY (preferred) or LOVABLE_API_KEY.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    let text: string | undefined;
    if (GOOGLE_API_KEY) {
      // Direct Google Gemini: instruct to return strict JSON
      const endpoint = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent';
      const sys = 'You return strict JSON only. No prose. No code fences.';
      const payload = {
        contents: [
          {
            role: 'user',
            parts: [{ text: `${sys}\n\n${prompt}` }],
          },
        ],
      };
      const r = await fetch(`${endpoint}?key=${GOOGLE_API_KEY}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!r.ok) {
        const t = await r.text();
        console.error('Gemini error', r.status, t);
        return new Response(JSON.stringify({ error: 'AI generation failed' }), { status: r.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const j = await r.json();
      text = j?.candidates?.[0]?.content?.parts?.[0]?.text;
    } else if (LOVABLE_API_KEY) {
      const r = await fetch('https://ai.gateway.lovable.dev/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${LOVABLE_API_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'google/gemini-2.5-flash',
          messages: [
            { role: 'system', content: 'You are a course author who returns strict JSON only.' },
            { role: 'user', content: prompt }
          ],
          temperature: 0.7,
        }),
      });
      if (!r.ok) {
        const t = await r.text();
        console.error('Lovable error', r.status, t);
        return new Response(JSON.stringify({ error: 'AI generation failed' }), { status: r.status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      const j = await r.json();
      text = j?.choices?.[0]?.message?.content;
    }

    if (!text) {
      return new Response(JSON.stringify({ error: 'Empty AI response' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    // Attempt to parse JSON content (strip possible markdown fences)
    const jsonText = text.replace(/^```(?:json)?\n|\n```$/g, '');
    let parsed: any;
    try {
      parsed = JSON.parse(jsonText);
    } catch (e) {
      console.error('Parse error', e, jsonText);
      return new Response(JSON.stringify({ error: 'Malformed AI JSON' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const course = parsed.course as { title: string; description: string; difficulty: string; estimated_hours: number; icon: string };
    const lessons = (parsed.lessons as GenLesson[]).slice(0, 12);

    return new Response(JSON.stringify({ course, lessons }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('Error:', error);
    const msg = error instanceof Error ? error.message : 'Unknown error';
    return new Response(JSON.stringify({ error: msg }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});


