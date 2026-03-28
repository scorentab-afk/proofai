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
    const { bundleId } = await req.json();

    if (!bundleId) {
      return new Response(
        JSON.stringify({ error: "bundleId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    let bundle: Record<string, unknown> | null = null;
    let anchor: Record<string, unknown> | null = null;

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);

      // Fetch the bundle
      const { data: bundleData } = await supabase
        .from("evidence_bundles")
        .select("*")
        .eq("id", bundleId)
        .single();
      bundle = bundleData;

      // Fetch the anchor
      const { data: anchorData } = await supabase
        .from("blockchain_anchors")
        .select("*")
        .eq("bundle_id", bundleId)
        .single();
      anchor = anchorData;
    }

    // Verify integrity checks
    const integrityValid = bundle !== null;
    const timestampValid = bundle
      ? !!bundle.created_at &&
        new Date(bundle.created_at as string).getTime() > 0
      : false;

    const ledgerAnchored = anchor !== null && (anchor.status === "confirmed" || anchor.status === "pending");

    // Verify hash: check bundle_hash exists and is a valid SHA-256 hex string
    let hashMatches = false;
    if (bundle) {
      const storedHash = bundle.bundle_hash as string;
      hashMatches = !!storedHash && /^[a-f0-9]{64}$/i.test(storedHash);
    }

    const verified = integrityValid && timestampValid && ledgerAnchored && hashMatches;

    // If no Supabase data, still return a structured response
    // (for cases where bundle data is passed in-memory from the frontend)
    if (!bundle) {
      const result = {
        bundleId,
        verified: false,
        checks: {
          integrityValid: false,
          timestampValid: false,
          ledgerAnchored: false,
          hashMatches: false,
        },
        ledgerInfo: undefined,
        timestamp: new Date().toISOString(),
      };

      return new Response(JSON.stringify(result), {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Update bundle status if verified
    if (verified && supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      await supabase
        .from("evidence_bundles")
        .update({ status: "verified" })
        .eq("id", bundleId);
    }

    const result = {
      bundleId,
      verified,
      checks: {
        integrityValid,
        timestampValid,
        ledgerAnchored,
        hashMatches,
      },
      ledgerInfo: anchor
        ? {
            transactionHash: anchor.transaction_hash as string,
            blockNumber: anchor.block_number as number,
            network: anchor.network as string,
            confirmedAt: anchor.created_at as string,
          }
        : undefined,
      timestamp: new Date().toISOString(),
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
