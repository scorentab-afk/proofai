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
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, serviceKey);

    // Read body first (stream can only be read once)
    const body = await req.json().catch(() => ({}));
    const name = body.name || "Default";

    // Get user from auth header
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid token: " + (authError?.message || "unknown") }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Ensure subscription exists (create if missing — handles OAuth signup edge case)
    const { data: existingSub } = await supabase
      .from("subscriptions")
      .select("plan")
      .eq("user_id", user.id)
      .single();

    if (!existingSub) {
      await supabase.from("subscriptions").insert({
        user_id: user.id,
        plan: "free",
        status: "active",
        proofs_included: 100,
        proofs_used_this_period: 0,
      });
    }

    const plan = existingSub?.plan || "free";

    // Generate API key: pk_live_ + 32 random chars
    const randomBytes = new Uint8Array(24);
    crypto.getRandomValues(randomBytes);
    const rawKey = Array.from(randomBytes)
      .map((b) => b.toString(36).padStart(2, "0"))
      .join("")
      .substring(0, 32);
    const apiKey = `pk_live_${rawKey}`;
    const keyPrefix = apiKey.substring(0, 12);

    // Hash the key for storage
    const encoder = new TextEncoder();
    const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(apiKey));
    const keyHash = Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");

    // Proof limits by plan
    const limitsMap: Record<string, number | null> = {
      free: 100,
      payg: null,
      indie: 500,
      startup: 2000,
      scale: 10000,
      enterprise: null,
    };

    // Insert key
    const { error: insertError } = await supabase.from("api_keys").insert({
      user_id: user.id,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      name,
      plan,
      proofs_used: 0,
      proofs_limit: limitsMap[plan] ?? 100,
    });

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(
      JSON.stringify({
        apiKey,
        keyPrefix,
        name,
        plan,
        message: "Save this key — it won't be shown again.",
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
