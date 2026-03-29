// ProofAI — Auth middleware for Edge Functions
// Verifies API key, checks proof quota, increments usage

import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.12";
import { checkProofAllowance, getProofCost, type PlanId } from "./plans.ts";

export interface AuthResult {
  userId: string;
  apiKeyId: string;
  plan: PlanId;
  proofsUsed: number;
  proofsLimit: number | null;
  allowed: boolean;
  error?: string;
}

async function sha256(data: string): Promise<string> {
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(data));
  return Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Authenticate request and check proof allowance.
 * Looks for API key in x-api-key header or Authorization Bearer token.
 */
export async function authenticateRequest(req: Request): Promise<AuthResult> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseKey) {
    return { userId: "", apiKeyId: "", plan: "free", proofsUsed: 0, proofsLimit: 100, allowed: true };
  }

  // Extract API key from headers
  const apiKey = req.headers.get("x-api-key") || "";
  const authHeader = req.headers.get("authorization") || "";
  const token = apiKey || authHeader.replace("Bearer ", "");

  if (!token) {
    return { userId: "", apiKeyId: "", plan: "free", proofsUsed: 0, proofsLimit: 100, allowed: true };
  }

  // Check if it's a pk_live_ key
  if (token.startsWith("pk_live_")) {
    const keyHash = await sha256(token);
    const supabase = createClient(supabaseUrl, supabaseKey);

    const { data: key } = await supabase
      .from("api_keys")
      .select("*")
      .eq("key_hash", keyHash)
      .eq("is_active", true)
      .single();

    if (!key) {
      return { userId: "", apiKeyId: "", plan: "free", proofsUsed: 0, proofsLimit: 100, allowed: false, error: "Invalid API key" };
    }

    const plan = (key.plan || "free") as PlanId;
    const proofsUsed = key.proofs_used || 0;
    const proofsLimit = key.proofs_limit;

    const check = checkProofAllowance(plan, proofsUsed, proofsLimit);

    return {
      userId: key.user_id,
      apiKeyId: key.id,
      plan,
      proofsUsed,
      proofsLimit,
      allowed: check.allowed,
      error: check.allowed ? undefined : (check as { reason: string }).reason,
    };
  }

  // Supabase anon key — treat as free tier
  return { userId: "", apiKeyId: "", plan: "free", proofsUsed: 0, proofsLimit: 100, allowed: true };
}

/**
 * Record a proof event and increment usage counters.
 * Call this after a bundle is successfully created.
 */
export async function recordProofEvent(
  auth: AuthResult,
  bundleId: string,
  provider: string,
  tokensUsed: number,
): Promise<void> {
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseKey || !auth.apiKeyId) return;

  const supabase = createClient(supabaseUrl, supabaseKey);
  const cost = getProofCost(auth.plan, auth.proofsUsed);

  // Record the proof event
  await supabase.from("proof_events").insert({
    api_key_id: auth.apiKeyId,
    user_id: auth.userId,
    bundle_id: bundleId,
    provider,
    tokens_used: tokensUsed,
    cost_euros: cost,
  });

  // Increment proofs_used on the API key
  await supabase
    .from("api_keys")
    .update({
      proofs_used: auth.proofsUsed + 1,
      last_used_at: new Date().toISOString(),
    })
    .eq("id", auth.apiKeyId);

  // Increment proofs_used_this_period on the subscription
  if (auth.userId) {
    await supabase.rpc("increment_proof_count", { uid: auth.userId }).catch(() => {
      // Fallback: direct update
      supabase
        .from("subscriptions")
        .update({ proofs_used_this_period: auth.proofsUsed + 1 })
        .eq("user_id", auth.userId);
    });
  }
}
