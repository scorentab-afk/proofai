import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.47.12";
import { authenticateRequest } from "../_shared/auth-middleware.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-api-key",
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

    // Blockchain anchoring requires Pay-as-you-go or higher
    if (auth.plan === "free" && auth.userId !== "") {
      return new Response(
        JSON.stringify({ error: "Blockchain anchoring requires Pay-as-you-go plan or higher", upgrade: true }),
        { status: 402, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const { bundleId, network = "polygon" } = await req.json();

    if (!bundleId) {
      return new Response(
        JSON.stringify({ error: "bundleId is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const alchemyKey = Deno.env.get("ALCHEMY_API_KEY");
    const privateKey = Deno.env.get("POLYGON_PRIVATE_KEY");

    if (!alchemyKey || !privateKey) {
      return new Response(
        JSON.stringify({ error: "ALCHEMY_API_KEY and POLYGON_PRIVATE_KEY must be set" }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Fetch bundle_hash from Supabase — this is what we anchor on-chain.
    // Regulators can verify independently: eth_getTransactionByHash → input === "0x" + bundle_hash
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    const supabase = supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

    let bundleHash: string | null = null;
    if (supabase) {
      const { data: bundleRow } = await supabase
        .from("evidence_bundles")
        .select("bundle_hash")
        .eq("id", bundleId)
        .single();
      bundleHash = bundleRow?.bundle_hash ?? null;
    }

    if (!bundleHash || !/^[a-f0-9]{64}$/i.test(bundleHash)) {
      return new Response(
        JSON.stringify({ error: "bundle_hash not found or invalid for bundleId" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Polygon mainnet RPC
    const rpcUrl = `https://polygon-mainnet.g.alchemy.com/v2/${alchemyKey}`;

    // Calldata = "0x" + bundle_hash (32 raw bytes, no derivation, no timestamp).
    // Any regulator can verify: eth_getTransactionByHash → tx.input === "0x" + bundle_hash
    const dataHex = `0x${bundleHash}`;

    const cleanKey = privateKey.startsWith("0x") ? privateKey.slice(2) : privateKey;
    const address = await getAddress(cleanKey);

    // Get nonce
    const nonceRes = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "eth_getTransactionCount", params: [address, "latest"] }),
    });
    const nonceData = await nonceRes.json();

    // Get gas price
    const gasPriceRes = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 2, method: "eth_gasPrice", params: [] }),
    });
    const gasPriceData = await gasPriceRes.json();

    if (!nonceData.result || !gasPriceData.result) {
      throw new Error(`RPC error: nonce=${JSON.stringify(nonceData)}, gasPrice=${JSON.stringify(gasPriceData)}`);
    }

    const nonceBig = BigInt(nonceData.result);
    const gasPriceBig = BigInt(gasPriceData.result);
    const CHAIN_ID = 137n; // Polygon mainnet
    const GAS_LIMIT = 50000n;

    // Build and sign EIP-155 raw transaction
    const rawTx = await buildSignedTx({
      nonce: nonceBig,
      gasPrice: gasPriceBig,
      gasLimit: GAS_LIMIT,
      to: address,
      value: 0n,
      data: dataHex,
      chainId: CHAIN_ID,
      privateKeyHex: cleanKey,
    });

    // Send signed raw transaction (works with Alchemy and all standard RPC providers)
    const txRes = await fetch(rpcUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ jsonrpc: "2.0", id: 3, method: "eth_sendRawTransaction", params: [rawTx] }),
    });
    const txData = await txRes.json();

    if (!txData.result) {
      throw new Error(`eth_sendRawTransaction failed: ${JSON.stringify(txData.error ?? txData)}`);
    }

    let transactionHash: string = txData.result;
    let blockNumber = 0;
    let status: "pending" | "confirmed" | "failed" = "pending";

    // Poll for receipt (up to ~15s)
    for (let i = 0; i < 5; i++) {
      await new Promise((r) => setTimeout(r, 3000));
      const receiptRes = await fetch(rpcUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ jsonrpc: "2.0", id: 4, method: "eth_getTransactionReceipt", params: [transactionHash] }),
      });
      const receiptData = await receiptRes.json();
      if (receiptData.result) {
        blockNumber = parseInt(receiptData.result.blockNumber, 16);
        status = receiptData.result.status === "0x1" ? "confirmed" : "failed";
        break;
      }
    }

    const explorerBase =
      network === "polygon"
        ? "https://polygonscan.com/tx"
        : "https://etherscan.io/tx";

    // Store in Supabase
    if (supabase) {
      await supabase.from("blockchain_anchors").insert({
        bundle_id: bundleId,
        transaction_hash: transactionHash,
        block_number: blockNumber,
        network,
        status,
        created_at: new Date().toISOString(),
      });

      // Update bundle status
      await supabase
        .from("evidence_bundles")
        .update({ status: "anchored" })
        .eq("id", bundleId);
    }

    const result = {
      bundleId,
      transactionHash,
      blockNumber,
      network,
      explorerUrl: `${explorerBase}/${transactionHash}`,
      status,
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

// --- RLP helpers ---

function intToMinBytes(n: bigint): Uint8Array {
  if (n === 0n) return new Uint8Array(0);
  const hex = n.toString(16);
  const padded = hex.length % 2 ? "0" + hex : hex;
  return new Uint8Array(padded.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
}

function hexStrToBytes(hex: string): Uint8Array {
  const h = hex.startsWith("0x") ? hex.slice(2) : hex;
  return new Uint8Array(h.match(/.{2}/g)!.map((b) => parseInt(b, 16)));
}

function rlpItem(buf: Uint8Array): Uint8Array {
  if (buf.length === 1 && buf[0] < 0x80) return buf;
  if (buf.length <= 55) return Uint8Array.from([0x80 + buf.length, ...buf]);
  const lenBytes = intToMinBytes(BigInt(buf.length));
  return Uint8Array.from([0xb7 + lenBytes.length, ...lenBytes, ...buf]);
}

function rlpList(items: Uint8Array[]): Uint8Array {
  const encoded = items.map(rlpItem);
  const totalLen = encoded.reduce((n, a) => n + a.length, 0);
  const body = new Uint8Array(totalLen);
  let offset = 0;
  for (const a of encoded) { body.set(a, offset); offset += a.length; }
  if (body.length <= 55) return Uint8Array.from([0xc0 + body.length, ...body]);
  const lenBytes = intToMinBytes(BigInt(body.length));
  return Uint8Array.from([0xf7 + lenBytes.length, ...lenBytes, ...body]);
}

function bytesToHex(bytes: Uint8Array): string {
  return "0x" + Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// --- Transaction signing (EIP-155) ---

async function buildSignedTx(params: {
  nonce: bigint;
  gasPrice: bigint;
  gasLimit: bigint;
  to: string;
  value: bigint;
  data: string;
  chainId: bigint;
  privateKeyHex: string;
}): Promise<string> {
  const { keccak_256 } = await import("https://esm.sh/@noble/hashes@1.6.1/sha3");
  const { secp256k1 } = await import("https://esm.sh/@noble/curves@1.7.0/secp256k1");

  const privKeyBytes = hexStrToBytes(params.privateKeyHex);

  // EIP-155 pre-image: [nonce, gasPrice, gasLimit, to, value, data, chainId, 0, 0]
  const preSigning = rlpList([
    intToMinBytes(params.nonce),
    intToMinBytes(params.gasPrice),
    intToMinBytes(params.gasLimit),
    hexStrToBytes(params.to),
    intToMinBytes(params.value),
    hexStrToBytes(params.data),
    intToMinBytes(params.chainId),
    new Uint8Array(0),
    new Uint8Array(0),
  ]);

  const msgHash = keccak_256(preSigning);
  const sig = secp256k1.sign(msgHash, privKeyBytes, { lowS: true });

  const v = params.chainId * 2n + 35n + BigInt(sig.recovery);
  const r = sig.r;
  const s = sig.s;

  // Signed transaction
  const signed = rlpList([
    intToMinBytes(params.nonce),
    intToMinBytes(params.gasPrice),
    intToMinBytes(params.gasLimit),
    hexStrToBytes(params.to),
    intToMinBytes(params.value),
    hexStrToBytes(params.data),
    intToMinBytes(v),
    intToMinBytes(r),
    intToMinBytes(s),
  ]);

  return bytesToHex(signed);
}

/**
 * Derive Ethereum address from raw private key hex.
 * Uses keccak-256 over the uncompressed public key.
 */
async function getAddress(privateKeyHex: string): Promise<string> {
  // Import the secp256k1 key and derive the public key
  // For Deno, we use a lightweight approach
  const { keccak_256 } = await import("https://esm.sh/@noble/hashes@1.6.1/sha3");
  const { secp256k1 } = await import("https://esm.sh/@noble/curves@1.7.0/secp256k1");

  const privKeyBytes = new Uint8Array(
    privateKeyHex.match(/.{1,2}/g)!.map((b) => parseInt(b, 16))
  );
  const pubKey = secp256k1.getPublicKey(privKeyBytes, false).slice(1); // uncompressed, remove 0x04 prefix
  const hash = keccak_256(pubKey);
  const address =
    "0x" +
    Array.from(hash.slice(-20))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  return address;
}
