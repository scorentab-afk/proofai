import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.12";
import { authenticateRequest } from "../_shared/auth-middleware.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
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
    const auth = await authenticateRequest(req);
    if (!auth.allowed) {
      return new Response(JSON.stringify({ error: auth.error }), {
        status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { bundleId, reviewerId, role, decision, notes } = await req.json();

    if (!bundleId || !reviewerId || !role || !decision) {
      return new Response(
        JSON.stringify({ error: "bundleId, reviewerId, role, and decision are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validRoles = ["compliance_officer", "data_protection_officer", "manager"];
    if (!validRoles.includes(role)) {
      return new Response(
        JSON.stringify({ error: `role must be one of: ${validRoles.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const validDecisions = ["approved", "rejected", "flagged"];
    if (!validDecisions.includes(decision)) {
      return new Response(
        JSON.stringify({ error: `decision must be one of: ${validDecisions.join(", ")}` }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Hash reviewer ID — never store in cleartext
    const reviewerIdHash = await sha256(reviewerId);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: "Supabase not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Insert human review
    const { data: review, error: insertError } = await supabase
      .from("human_reviews")
      .insert({
        bundle_id: bundleId,
        reviewer_id_hash: reviewerIdHash,
        reviewer_role: role,
        decision,
        notes: notes || null,
      })
      .select()
      .single();

    if (insertError) {
      return new Response(
        JSON.stringify({ error: insertError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update bundle status based on decision
    const statusMap: Record<string, string> = {
      approved: "verified",
      rejected: "created",
      flagged: "created",
    };
    await supabase
      .from("evidence_bundles")
      .update({ status: statusMap[decision] })
      .eq("id", bundleId);

    return new Response(
      JSON.stringify({
        id: review.id,
        bundleId,
        reviewerIdHash,
        role,
        decision,
        notes: notes || null,
        reviewedAt: review.reviewed_at,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
