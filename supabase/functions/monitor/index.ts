import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.12";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: "Supabase not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    // Total executions in last 30 days
    const { count: totalExecutions } = await supabase
      .from("evidence_bundles")
      .select("*", { count: "exact", head: true })
      .gte("created_at", thirtyDaysAgo);

    // Bundles by status
    const { data: statusData } = await supabase
      .from("evidence_bundles")
      .select("status")
      .gte("created_at", thirtyDaysAgo);

    const statusCounts: Record<string, number> = {};
    for (const row of statusData || []) {
      statusCounts[row.status] = (statusCounts[row.status] || 0) + 1;
    }

    // Human reviews in last 30 days
    const { data: reviewData } = await supabase
      .from("human_reviews")
      .select("decision")
      .gte("reviewed_at", thirtyDaysAgo);

    const reviewCounts: Record<string, number> = {};
    for (const row of reviewData || []) {
      reviewCounts[row.decision] = (reviewCounts[row.decision] || 0) + 1;
    }

    // Anomaly detection
    const anomalies: Array<{ type: string; description: string; severity: string }> = [];

    // Check for flagged bundles
    const flaggedCount = reviewCounts["flagged"] || 0;
    if (flaggedCount > 0) {
      anomalies.push({
        type: "flagged_bundles",
        description: `${flaggedCount} bundle(s) flagged by human reviewers`,
        severity: flaggedCount > 5 ? "high" : "medium",
      });
    }

    // Check for rejected bundles
    const rejectedCount = reviewCounts["rejected"] || 0;
    if (rejectedCount > 0) {
      anomalies.push({
        type: "rejected_bundles",
        description: `${rejectedCount} bundle(s) rejected by human reviewers`,
        severity: rejectedCount > 3 ? "high" : "low",
      });
    }

    // Check for failed anchors
    const { count: failedAnchors } = await supabase
      .from("blockchain_anchors")
      .select("*", { count: "exact", head: true })
      .eq("status", "failed")
      .gte("created_at", thirtyDaysAgo);

    if (failedAnchors && failedAnchors > 0) {
      anomalies.push({
        type: "failed_anchors",
        description: `${failedAnchors} blockchain anchor(s) failed`,
        severity: "medium",
      });
    }

    // Check for soft-deleted (GDPR) bundles
    const { count: deletedCount } = await supabase
      .from("evidence_bundles")
      .select("*", { count: "exact", head: true })
      .not("deleted_at", "is", null)
      .gte("created_at", thirtyDaysAgo);

    // Risk distribution
    const total = totalExecutions || 0;
    const verified = statusCounts["verified"] || 0;
    const anchored = statusCounts["anchored"] || 0;
    const created = statusCounts["created"] || 0;

    const riskDistribution = {
      low: verified,
      medium: anchored + created,
      high: flaggedCount + rejectedCount,
    };

    const result = {
      period: "last_30_days",
      generatedAt: new Date().toISOString(),
      totalExecutions: total,
      anomalyCount: anomalies.length,
      anomalies,
      statusBreakdown: statusCounts,
      humanReviews: {
        total: reviewData?.length || 0,
        approved: reviewCounts["approved"] || 0,
        rejected: rejectedCount,
        flagged: flaggedCount,
      },
      riskDistribution,
      gdpr: {
        anonymizedBundles: deletedCount || 0,
      },
      compliance: {
        retentionPolicy: "6_months",
        loggingEnabled: true,
        humanOversightActive: (reviewData?.length || 0) > 0,
        blockchainAnchoringActive: (anchored + verified) > 0,
      },
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
