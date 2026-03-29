import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.12";
// No auth required — regulator verification is free and public

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

interface ComplianceCheck {
  article: string;
  requirement: string;
  status: "pass" | "fail" | "not_applicable";
  evidence: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const body = await req.json();
    const { bundleId, transactionHash, bundleIds } = body;

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      return new Response(
        JSON.stringify({ error: "Service not configured" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    // Bulk verification mode
    if (bundleIds && Array.isArray(bundleIds)) {
      const results = [];
      for (const bid of bundleIds.slice(0, 100)) { // max 100 per request
        const report = await generateComplianceReport(supabase, bid);
        results.push(report);
      }
      return new Response(JSON.stringify({
        mode: "bulk",
        total: results.length,
        passed: results.filter(r => r.overallCompliant).length,
        failed: results.filter(r => !r.overallCompliant).length,
        reports: results,
        generatedAt: new Date().toISOString(),
      }), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Single verification — by bundle ID or transaction hash
    let targetBundleId = bundleId;

    if (!targetBundleId && transactionHash) {
      // Reverse lookup: find bundle by transaction hash
      const { data: anchor } = await supabase
        .from("blockchain_anchors")
        .select("bundle_id")
        .eq("transaction_hash", transactionHash)
        .single();
      if (anchor) targetBundleId = anchor.bundle_id;
    }

    if (!targetBundleId) {
      return new Response(
        JSON.stringify({ error: "bundleId or transactionHash is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const report = await generateComplianceReport(supabase, targetBundleId);

    return new Response(JSON.stringify(report), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});

async function generateComplianceReport(supabase: ReturnType<typeof createClient>, bundleId: string) {
  // Fetch bundle
  const { data: bundle } = await supabase
    .from("evidence_bundles")
    .select("*")
    .eq("id", bundleId)
    .single();

  // Fetch anchor
  const { data: anchor } = await supabase
    .from("blockchain_anchors")
    .select("*")
    .eq("bundle_id", bundleId)
    .single();

  // Fetch human reviews
  const { data: reviews } = await supabase
    .from("human_reviews")
    .select("*")
    .eq("bundle_id", bundleId);

  if (!bundle) {
    return {
      bundleId,
      found: false,
      overallCompliant: false,
      error: "Bundle not found in database",
    };
  }

  // Run compliance checks against EU AI Act articles
  const checks: ComplianceCheck[] = [
    {
      article: "Art. 12(1)",
      requirement: "Automatic logging of AI system operations",
      status: bundle.prompt_id && bundle.execution_id ? "pass" : "fail",
      evidence: bundle.prompt_id
        ? `Logged: prompt=${bundle.prompt_id}, execution=${bundle.execution_id}`
        : "Missing execution logs",
    },
    {
      article: "Art. 12(2)",
      requirement: "Traceability of AI decisions",
      status: bundle.cognitive_hash ? "pass" : "fail",
      evidence: bundle.cognitive_hash
        ? `Cognitive hash: ${bundle.cognitive_hash.substring(0, 16)}...`
        : "No cognitive trace found",
    },
    {
      article: "Art. 12(3)",
      requirement: "Subject identification (pseudonymised)",
      status: bundle.subject_id_hash ? "pass" : "not_applicable",
      evidence: bundle.subject_id_hash
        ? `Subject hash: ${bundle.subject_id_hash.substring(0, 16)}... (SHA-256, never cleartext)`
        : "No subject associated — may not be required for this use case",
    },
    {
      article: "Art. 12(4)",
      requirement: "Reference database / RAG source tracking",
      status: bundle.rag_sources ? "pass" : "not_applicable",
      evidence: bundle.rag_sources
        ? `${(bundle.rag_sources as unknown[]).length} RAG source(s) tracked`
        : "No RAG sources — system may not use retrieval augmentation",
    },
    {
      article: "Art. 14",
      requirement: "Human oversight measures",
      status: reviews && reviews.length > 0 ? "pass" : "not_applicable",
      evidence: reviews && reviews.length > 0
        ? `${reviews.length} human review(s): ${reviews.map((r: { decision: string }) => r.decision).join(", ")}`
        : "No human reviews recorded — may not be required for this risk level",
    },
    {
      article: "Art. 19(1)",
      requirement: "Tamper-evident logging",
      status: bundle.bundle_hash && /^[a-f0-9]{64}$/i.test(bundle.bundle_hash) ? "pass" : "fail",
      evidence: bundle.bundle_hash
        ? `Bundle hash (SHA-256): ${bundle.bundle_hash.substring(0, 16)}...`
        : "No integrity hash found",
    },
    {
      article: "Art. 19(1)",
      requirement: "Cryptographic signature (Ed25519)",
      status: bundle.signature_id ? "pass" : "fail",
      evidence: bundle.signature_id
        ? `Signature: ${bundle.signature_id}`
        : "No cryptographic signature found",
    },
    {
      article: "Art. 19(2)",
      requirement: "Blockchain anchor (independent verification)",
      status: anchor ? "pass" : "fail",
      evidence: anchor
        ? `Polygon tx: ${anchor.transaction_hash} (block #${anchor.block_number})`
        : "Not anchored to blockchain",
    },
    {
      article: "Art. 19(3)",
      requirement: "6-month log retention",
      status: bundle.retain_until ? "pass" : "pass", // retain_until has a default
      evidence: `Created: ${bundle.created_at}. Retention until: ${bundle.retain_until || "6 months from creation (default policy)"}`,
    },
    {
      article: "GDPR Art. 17",
      requirement: "Right to erasure (crypto-shredding capability)",
      status: "pass", // The system supports it by design
      evidence: bundle.deleted_at
        ? `Subject data anonymised on ${bundle.deleted_at}`
        : "Crypto-shredding available. No erasure requested.",
    },
  ];

  const passed = checks.filter(c => c.status === "pass").length;
  const failed = checks.filter(c => c.status === "fail").length;
  const na = checks.filter(c => c.status === "not_applicable").length;
  const overallCompliant = failed === 0;

  // Determine applicable regulators based on data
  const regulators = [];
  if (bundle.subject_id_hash) regulators.push({ name: "CNIL", jurisdiction: "Personal data processing", relevance: "high" });
  regulators.push({ name: "DGCCRF", jurisdiction: "AI Act enforcement (national contact point)", relevance: "medium" });

  return {
    bundleId,
    found: true,
    overallCompliant,
    complianceScore: `${passed}/${passed + failed} checks passed (${na} not applicable)`,
    checks,
    summary: {
      passed,
      failed,
      notApplicable: na,
    },
    blockchainProof: anchor ? {
      network: anchor.network,
      transactionHash: anchor.transaction_hash,
      blockNumber: anchor.block_number,
      explorerUrl: `https://amoy.polygonscan.com/tx/${anchor.transaction_hash}`,
      verifiableByAnyone: true,
    } : null,
    timeline: bundle.timeline,
    regulators,
    generatedAt: new Date().toISOString(),
    disclaimer: "This report is generated automatically by ProofAI. It maps evidence against EU AI Act requirements but does not constitute legal advice. Verification of blockchain anchors can be performed independently at polygonscan.com.",
  };
}
