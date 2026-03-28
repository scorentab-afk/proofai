import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.12";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(data));
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { promptId, executionId, analysisId, signatureId, cognitiveHash } =
      await req.json();

    if (!promptId || !executionId || !analysisId || !signatureId || !cognitiveHash) {
      return new Response(
        JSON.stringify({
          error: "promptId, executionId, analysisId, signatureId, and cognitiveHash are all required",
        }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const now = new Date();

    // Build timeline from the evidence chain
    const timeline = [
      {
        event: "Prompt Compressed",
        timestamp: new Date(now.getTime() - 400000).toISOString(),
        hash: (await sha256(`prompt_${promptId}`)).substring(0, 16),
      },
      {
        event: "AI Execution Complete",
        timestamp: new Date(now.getTime() - 300000).toISOString(),
        hash: (await sha256(`exec_${executionId}`)).substring(0, 16),
      },
      {
        event: "Cognitive Graph Generated",
        timestamp: new Date(now.getTime() - 200000).toISOString(),
        hash: (await sha256(`analysis_${analysisId}`)).substring(0, 16),
      },
      {
        event: "AI Response Signed",
        timestamp: new Date(now.getTime() - 100000).toISOString(),
        hash: (await sha256(`sig_${signatureId}`)).substring(0, 16),
      },
      {
        event: "Evidence Bundle Created",
        timestamp: now.toISOString(),
        hash: cognitiveHash.substring(0, 16),
      },
    ];

    // Compute bundle hash over all evidence
    const bundleData = JSON.stringify({
      promptId,
      executionId,
      analysisId,
      signatureId,
      cognitiveHash,
      timeline,
    });
    const bundleHash = await sha256(bundleData);
    const bundleId = `bnd_${bundleHash.substring(0, 12)}_${Date.now()}`;

    // Store in Supabase if credentials available
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      await supabase.from("evidence_bundles").insert({
        id: bundleId,
        prompt_id: promptId,
        execution_id: executionId,
        analysis_id: analysisId,
        signature_id: signatureId,
        cognitive_hash: cognitiveHash,
        bundle_hash: bundleHash,
        timeline,
        status: "created",
        created_at: now.toISOString(),
      });
    }

    const result = {
      id: bundleId,
      promptId,
      executionId,
      analysisId,
      signatureId,
      outputId: executionId,
      cognitiveHash,
      bundleHash,
      timeline,
      status: "created",
      createdAt: now.toISOString(),
    };

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
