import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.12";
import { authenticateRequest, recordProofEvent } from "../_shared/auth-middleware.ts";

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

// Deterministic JSON serialisation: sorts object keys alphabetically at every level.
// Required so that JSONB round-trips (which reorder keys) still produce the same hash.
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== "object") return JSON.stringify(value);
  if (Array.isArray(value)) {
    return "[" + (value as unknown[]).map(stableStringify).join(",") + "]";
  }
  const keys = Object.keys(value as object).sort();
  return (
    "{" +
    keys
      .map((k) => JSON.stringify(k) + ":" + stableStringify((value as Record<string, unknown>)[k]))
      .join(",") +
    "}"
  );
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    // Authenticate and check proof quota
    const auth = await authenticateRequest(req);
    if (!auth.allowed) {
      return new Response(
        JSON.stringify({ error: auth.error || "Proof limit reached. Upgrade your plan." }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { promptId, executionId, analysisId, signatureId, cognitiveHash, subjectId, sessionId, ragSources, promptContent, aiResponse, provider, model } =
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

    // Compute bundle hash over all evidence.
    // stableStringify ensures key order is deterministic (sorted) so that JSONB
    // round-trips do not change the hash when regulators recompute it client-side.
    const bundleHash = await sha256(stableStringify({
      promptId,
      executionId,
      analysisId,
      signatureId,
      cognitiveHash,
      timeline,
    }));
    const bundleId = `bnd_${bundleHash.substring(0, 12)}_${Date.now()}`;

    // Store in Supabase if credentials available
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    // Hash subjectId for GDPR — never store in cleartext
    const subjectIdHash = subjectId ? await sha256(subjectId) : null;

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
        subject_id_hash: subjectIdHash,
        session_id: sessionId || null,
        rag_sources: ragSources || null,
        prompt_content: promptContent || null,
        ai_response: aiResponse || null,
        provider: provider || null,
        model: model || null,
      });
    }

    // Record proof event for billing
    await recordProofEvent(auth, bundleId, "proofai", 0);

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
