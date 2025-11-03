import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

// ✅ Proper CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-api-version, x-supabase-authorization, x-requested-with",
  "Access-Control-Allow-Methods": "POST, OPTIONS, GET",
  "Access-Control-Max-Age": "86400",
  "Vary": "Origin",
};

serve(async (req) => {
  // ✅ Handle CORS preflight request
  if (req.method === "OPTIONS") {
    const reqHeaders =
      req.headers.get("Access-Control-Request-Headers") ||
      corsHeaders["Access-Control-Allow-Headers"];

    const dynamicHeaders = {
      ...corsHeaders,
      "Access-Control-Allow-Headers": reqHeaders,
    } as Record<string, string>;

    // ✅ Always return status 200 and a short body for CORS success
    return new Response("ok", {
      status: 200,
      headers: dynamicHeaders,
    });
  }

  try {
    const { lessonId, courseId, title, outline } = await req.json();

    if (!lessonId || !courseId || !title) {
      return new Response(
        JSON.stringify({ error: "lessonId, courseId and title are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY");
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");

    if (!GOOGLE_API_KEY && !LOVABLE_API_KEY) {
      return new Response(
        JSON.stringify({
          error:
            "No AI provider configured. Set GOOGLE_API_KEY or LOVABLE_API_KEY.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ✅ Initialize Supabase client (RLS-aware)
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authHeader = req.headers.get("Authorization");

    const supabase = createClient(supabaseUrl, serviceKey ?? supabaseAnonKey, {
      global: { headers: serviceKey ? {} : { Authorization: authHeader ?? "" } },
    });

    // ✅ Check for existing lesson
    const { data: existing, error: fetchErr } = await supabase
      .from("lessons")
      .select("content, title, estimated_minutes, xp_reward")
      .eq("id", lessonId)
      .eq("course_id", courseId)
      .single();

    if (fetchErr && (fetchErr as any).code !== "PGRST116") {
      return new Response(JSON.stringify({ error: fetchErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (existing?.content) {
      return new Response(JSON.stringify({ content: existing.content }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ✅ AI Prompt setup
    const system =
      "You are a financial literacy lesson author. Return clear, structured content with headings, bullet points, and examples. Keep it actionable and concise.";
    const userPrompt = `Write a complete lesson for the topic: "${title}".
Context/Outline (optional): ${outline ?? "N/A"}
Audience: Beginners. Keep it India-friendly when relevant.
Output plain text/markdown. No code fences.`;

    let contentText = "";

    // ✅ Google Gemini
    if (GOOGLE_API_KEY) {
      const endpoint =
        "https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent";
      const payload = {
        contents: [{ role: "user", parts: [{ text: `${system}\n\n${userPrompt}` }] }],
      };

      const r = await fetch(`${endpoint}?key=${GOOGLE_API_KEY}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!r.ok) {
        const t = await r.text();
        console.error("Gemini error", r.status, t);
        return new Response(JSON.stringify({ error: "AI generation failed" }), {
          status: r.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const j = await r.json();
      contentText = j?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    }
    // ✅ Lovable AI fallback
    else {
      const r = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-2.5-flash",
          messages: [
            { role: "system", content: system },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
        }),
      });

      if (!r.ok) {
        const t = await r.text();
        console.error("Lovable error", r.status, t);
        return new Response(JSON.stringify({ error: "AI generation failed" }), {
          status: r.status,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }

      const j = await r.json();
      contentText = j?.choices?.[0]?.message?.content ?? "";
    }

    // ✅ Save generated content
    const { error: updateErr } = await supabase
      .from("lessons")
      .update({ content: contentText })
      .eq("id", lessonId)
      .eq("course_id", courseId);

    if (updateErr) {
      return new Response(JSON.stringify({ error: updateErr.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ✅ Return success response
    return new Response(JSON.stringify({ content: contentText }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error:", error);
    const msg = error instanceof Error ? error.message : "Unknown error";
    return new Response(JSON.stringify({ error: msg }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
