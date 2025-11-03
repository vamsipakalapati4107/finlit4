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
    const { courseId, titleHint } = await req.json();
    const title = titleHint ?? "Financial Literacy";
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
    // Supabase client for persistence
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRole = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = supabaseUrl && (anonKey || serviceRole)
      ? createClient(supabaseUrl, serviceRole ?? anonKey!)
      : null;

    const jsonPrompt = `Return ONLY JSON.
Design a financial literacy course titled "${title}" for beginners in India.
JSON schema:
{
  "course": { "title": string, "description": string, "difficulty": "beginner"|"intermediate"|"advanced", "estimated_hours": number, "icon": string },
  "lessons": [
    { "title": string, "content": string, "xp_reward": number, "estimated_minutes": number }
  ]
}
Constraints: 5-8 lessons. content should be markdown, concise, practical, with headings & bullet points.`;

    const url = `https://generativelanguage.googleapis.com/v1/models/gemini-2.5-flash-lite:generateContent?key=${GOOGLE_API_KEY}`;
    const body = {
      contents: [
        { parts: [{ text: jsonPrompt }] },
      ],
      generationConfig: { temperature: 0.6, maxOutputTokens: 4096 },
    } as const;

    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    const raw = await response.text();
    if (!response.ok) {
      return new Response(JSON.stringify({ error: `Gemini error ${response.status}`, raw: raw.slice(0, 800) }), {
        status: response.status,
        headers: corsHeaders,
      });
    }

    let parsed: any = null;
    try {
      const j = JSON.parse(raw);
      const txt = j?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
      parsed = JSON.parse(txt);
    } catch (e) {
      // Fallback: basic course and a single lesson from text
      parsed = {
        course: {
          title,
          description: `${title} course overview`,
          difficulty: "beginner",
          estimated_hours: 3,
          icon: "📘",
        },
        lessons: [
          { title: `${title} Basics`, content: raw.slice(0, 2000), xp_reward: 100, estimated_minutes: 10 },
        ],
      };
    }

    // Ensure minimal structure
    const courseOut = parsed.course ?? { title, description: `${title} course`, difficulty: "beginner", estimated_hours: 3, icon: "📘" };
    const lessonsOut: any[] = Array.isArray(parsed.lessons) && parsed.lessons.length > 0 ? parsed.lessons : [
      { title: `${title} 101`, content: "Introduction", xp_reward: 100, estimated_minutes: 10 },
    ];

    // Persist to DB if possible
    let finalCourseId = courseId;
    if (supabase) {
      // Upsert course
      if (finalCourseId) {
        await supabase.from("courses").upsert({
          id: finalCourseId,
          title: courseOut.title,
          description: courseOut.description,
          difficulty: courseOut.difficulty ?? "beginner",
          lessons_count: lessonsOut.length,
          estimated_hours: courseOut.estimated_hours ?? 3,
          icon: courseOut.icon ?? "📘",
        }).select();
      } else {
        const { data: cins } = await supabase.from("courses").insert({
          title: courseOut.title,
          description: courseOut.description,
          difficulty: courseOut.difficulty ?? "beginner",
          lessons_count: lessonsOut.length,
          estimated_hours: courseOut.estimated_hours ?? 3,
          icon: courseOut.icon ?? "📘",
        }).select("id").single();
        finalCourseId = cins?.id ?? finalCourseId;
      }

      if (finalCourseId) {
        // Delete existing lessons for idempotency, then insert
        await supabase.from("lessons").delete().eq("course_id", finalCourseId);
        const rows = lessonsOut.map((l, idx) => ({
          course_id: finalCourseId,
          title: l.title,
          content: l.content,
          order_index: idx + 1,
          xp_reward: l.xp_reward ?? 100,
          estimated_minutes: l.estimated_minutes ?? 10,
        }));
        if (rows.length > 0) {
          await supabase.from("lessons").insert(rows);
        }
      }
    }

    // Return structured payload for client-side rendering as well
    return new Response(JSON.stringify({
      course: {
        title: courseOut.title,
        description: courseOut.description,
        difficulty: courseOut.difficulty,
        estimated_hours: courseOut.estimated_hours,
        icon: courseOut.icon,
      },
      lessons: lessonsOut,
      courseId: finalCourseId,
    }), { headers: corsHeaders });
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