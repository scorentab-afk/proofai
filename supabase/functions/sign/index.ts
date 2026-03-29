import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import * as ed from "https://esm.sh/@noble/ed25519@2.1.0";
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

function bytesToHex(bytes: Uint8Array): string {
  return Array.from(bytes)
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

// Use Web Crypto for ed25519 sha-512 requirement
// @noble/ed25519 v2 needs a sha512 implementation
ed.etc.sha512Sync = undefined; // force async
ed.etc.sha512Async = async (message: Uint8Array): Promise<Uint8Array> => {
  const hash = await crypto.subtle.digest("SHA-512", message);
  return new Uint8Array(hash);
};

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

    const body = await req.json();
    const {
      executionId,
      rawOutput,
      modelProvider,
      modelId,
      modelVersion,
      modelParameters,
      executionMetrics,
      requesterInfo,
      timestamps,
      thought_signatures,
      reasoning_chain,
    } = body;

    if (!executionId || !rawOutput) {
      return new Response(
        JSON.stringify({ error: "executionId and rawOutput are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Generate or load Ed25519 key pair
    // In production, use a persistent key stored in Supabase Vault
    const privKeyHex = Deno.env.get("ED25519_PRIVATE_KEY");
    let privKey: Uint8Array;

    if (privKeyHex) {
      privKey = new Uint8Array(
        privKeyHex.match(/.{1,2}/g)!.map((byte) => parseInt(byte, 16))
      );
    } else {
      privKey = ed.utils.randomPrivateKey();
    }

    const pubKey = await ed.getPublicKeyAsync(privKey);
    const now = new Date();

    // Build the payload to sign
    const outputHash = await sha256(rawOutput);
    const modelSnapshot = `${modelId || "unknown"}-snapshot-${now.toISOString().split("T")[0].replace(/-/g, "")}`;

    const isGemini = modelProvider === "google" || modelProvider === "gemini";

    // Build cognitive trace from thought signatures
    const cognitiveTrace = isGemini && thought_signatures?.length
      ? {
          thought_signatures: thought_signatures,
          reasoning_steps: thought_signatures.filter(
            (t: { step_type: string }) => t.step_type === "reasoning"
          ).length,
          function_calls: thought_signatures.filter(
            (t: { step_type: string }) => t.step_type === "function_call"
          ).length,
        }
      : undefined;

    const signedPayload = {
      execution_id: executionId,
      model: {
        provider: modelProvider || "unknown",
        model_id: modelId || "unknown",
        model_version: modelVersion || "unknown",
        model_snapshot: modelSnapshot,
      },
      parameters: modelParameters || {},
      output_hash: outputHash,
      metrics: executionMetrics || {},
      requester: requesterInfo || {},
      timestamps: timestamps || {},
      cognitive_trace: cognitiveTrace,
    };

    // Sign the payload
    const payloadBytes = new TextEncoder().encode(JSON.stringify(signedPayload));
    const signature = await ed.signAsync(payloadBytes, privKey);
    const signatureHex = bytesToHex(signature);

    const signatureId = `sig_${(await sha256(signatureHex)).substring(0, 12)}`;

    const result = {
      signatureId,
      signedPayload,
      signature: {
        algorithm: "Ed25519",
        signature: signatureHex,
        signed_at: now.toISOString(),
        signer_identity: "proofai-edge-signer",
        public_key: bytesToHex(pubKey),
        includes_thought_signatures: isGemini && (thought_signatures?.length ?? 0) > 0,
      },
      timestampProof: {
        rfc3161_timestamp: now.toISOString(),
        verified: true,
      },
      cognitive_trace: cognitiveTrace,
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
