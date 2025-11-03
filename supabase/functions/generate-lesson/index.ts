import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "OPTIONS, POST",
  "Content-Type": "application/json",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { lessonId, courseId, title, outline } = await req.json();
    if (!title) {
      return new Response(JSON.stringify({ error: "Missing 'title'" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const GOOGLE_API_KEY = Deno.env.get("GOOGLE_API_KEY") || Deno.env.get("GEMINI_API_KEY");
    if (!GOOGLE_API_KEY) {
      return new Response(
        JSON.stringify({ error: "❌ GOOGLE_API_KEY/GEMINI_API_KEY not set in Supabase secrets" }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Initialize Supabase client for optional persistence
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const authHeader = req.headers.get("Authorization") ?? "";
    const supabase = supabaseUrl && (anonKey || serviceRole)
      ? createClient(supabaseUrl, serviceRole ?? anonKey!, {
          global: { headers: serviceRole ? {} : { Authorization: authHeader } },
        })
      : null;

    const system =
      "You are an expert Indian financial literacy educator. Produce deeply detailed, actionable lessons in clean Markdown with clear structure and pedagogy.";
    const prompt = `Create a comprehensive lesson on: "${title}"\n\nRequirements:\n- Audience: Beginners in India (ages 13–22).\n- Tone: Clear, friendly, and practical.\n- Output: Pure Markdown (no code fences).\n- Length: 900–1400 words.\n\nMust include, in order:\n1. Title (H1)\n2. Why it matters (3–5 bullets)\n3. Core concepts (H2) with subsections and examples (India-specific where possible)\n4. Step-by-step guide or framework with numbered steps\n5. Do/Don't checklist\n6. Real-life scenarios (2–3) with outcomes\n7. Mini case study (India context)\n8. Common mistakes and how to fix them\n9. Glossary (5–8 terms, simple definitions)\n10. 3 Multiple-Choice Questions with answers marked\n11. 7-day action plan (bullet list)\n12. Quick recap (3 bullets)\n13. Motivational tip\n\nContext/Outline (optional): ${outline ?? "N/A"}`;

    // ✅ Using gemini-2.5-flash-lite
    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent?key=${GOOGLE_API_KEY}`;

    const body = {
      contents: [
        {
          parts: [{ text: `${system}\n\n${prompt}` }],
        },
      ],
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 4096,
        topP: 0.9,
      },
    };

    console.log("Calling Gemini API...");
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    console.log("Response status:", response.status);
    console.log("Response headers:", Object.fromEntries(response.headers.entries()));
    console.log("Gemini raw response:", text);

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: `Gemini API error (${response.status})`,
          details: text,
        }),
        { status: response.status, headers: corsHeaders }
      );
    }

    if (!text || text.trim() === "") {
      return new Response(
        JSON.stringify({
          error: "Empty response from Gemini API",
          hint: "Check your API key, quota, and billing status at https://makersuite.google.com/app/apikey",
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      return new Response(
        JSON.stringify({
          error: "Invalid JSON from Gemini",
          raw: text.slice(0, 500),
          parseError: parseError.message,
        }),
        { status: 500, headers: corsHeaders }
      );
    }

    // Extract lesson text
    const lessonText =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ||
      "⚠️ No lesson generated (empty response from Gemini).";

    if (lessonText.includes("⚠️")) {
      console.log("Full Gemini response:", JSON.stringify(data, null, 2));
    }

    // Persist only if empty content in DB
    let saved = false as boolean;
    let dbError: string | null = null;
    if (supabase && lessonId && courseId) {
      const { data: existingRow, error: selErr } = await supabase
        .from("lessons")
        .select("content")
        .eq("id", lessonId)
        .eq("course_id", courseId)
        .single();
      if (!selErr) {
        const hasExisting = !!(existingRow?.content && String(existingRow.content).trim() !== "");
        if (!hasExisting) {
          const { error: updErr } = await supabase
            .from("lessons")
            .update({ content: lessonText })
            .eq("id", lessonId)
            .eq("course_id", courseId);
          if (updErr) {
            dbError = updErr.message ?? "Unknown DB error";
            console.error("DB update failed:", dbError);
          } else {
            saved = true;
          }
        }
      } else {
        // If lesson row does not exist, attempt to insert it with minimal fields
        const { error: insErr } = await supabase
          .from("lessons")
          .insert({
            id: lessonId,
            course_id: courseId,
            title: title ?? 'Lesson',
            content: lessonText,
            order_index: 1,
            xp_reward: 100,
            estimated_minutes: 10,
          });
        if (insErr) {
          dbError = insErr.message ?? "Unknown DB insert error";
          console.error("DB insert failed:", dbError);
        } else {
          saved = true;
        }
      }
    }

    return new Response(JSON.stringify({ content: lessonText, saved, dbError }), {
      headers: corsHeaders,
    });
  } catch (err) {
    console.error("Unhandled error:", err);
    return new Response(
      JSON.stringify({
        error: err.message,
        stack: err.stack,
      }),
      {
        status: 500,
        headers: corsHeaders,
      }
    );
  }
});