/**
 * In-browser Polygon anchor verification — zero ProofAI involvement.
 *
 * Verification protocol:
 *   1. Call eth_getTransactionByHash on a public Polygon RPC
 *   2. Check tx.input === "0x" + bundle_hash  (the anchor payload)
 *
 * RPCs are ordered by confirmed browser CORS support (tested 2026-04).
 * polygon-rpc.com and ankr have variable CORS — kept as last-resort fallbacks.
 */

const POLYGON_RPCS = [
  "https://polygon.llamarpc.com",
  "https://polygon-bor-rpc.publicnode.com",
  "https://1rpc.io/matic",
  "https://rpc.ankr.com/polygon",
  "https://polygon-rpc.com",
];

export interface OnChainResult {
  valid: boolean;
  txHash: string;
  blockNumber?: number;
  timestamp?: number;
  from?: string;
  reason?: string;
}

async function rpcCall(
  url: string,
  method: string,
  params: unknown[],
): Promise<unknown> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message ?? JSON.stringify(data.error));
  return data.result;
}

async function rpcCallWithFallback(
  method: string,
  params: unknown[],
): Promise<unknown> {
  let lastErr: Error | null = null;
  for (const rpc of POLYGON_RPCS) {
    try {
      return await rpcCall(rpc, method, params);
    } catch (e) {
      lastErr = e as Error;
    }
  }
  throw lastErr ?? new Error("All Polygon RPCs failed");
}

/**
 * Verify that a Polygon transaction anchors the given bundle_hash.
 *
 * @param txHash          Transaction hash stored in blockchain_anchors
 * @param expectedBundleHash  64-char hex sha-256 bundle_hash from evidence_bundles
 * @param expectedFrom    ProofAI wallet address (optional, for belt-and-suspenders)
 */
export async function verifyOnChain(
  txHash: string,
  expectedBundleHash: string,
  expectedFrom?: string,
): Promise<OnChainResult> {
  if (!txHash || !expectedBundleHash) {
    return { valid: false, txHash: txHash ?? "", reason: "Missing txHash or bundle_hash" };
  }

  let tx: Record<string, string> | null = null;
  try {
    tx = (await rpcCallWithFallback("eth_getTransactionByHash", [txHash])) as Record<string, string> | null;
  } catch (e) {
    const msg = (e as Error).message ?? "";
    const isCors = msg.toLowerCase().includes("fetch") || msg.toLowerCase().includes("network");
    return {
      valid: false,
      txHash,
      reason: isCors ? "cors_blocked" : `RPC error: ${msg}`,
    };
  }

  if (!tx) {
    return { valid: false, txHash, reason: "Transaction not found on Polygon" };
  }

  // tx.input is "0x" + bundle_hash (64 hex chars = 32 bytes)
  const expectedInput = `0x${expectedBundleHash.toLowerCase()}`;
  const actualInput = (tx.input ?? "").toLowerCase();

  if (actualInput !== expectedInput) {
    return {
      valid: false,
      txHash,
      from: tx.from,
      reason: `Calldata mismatch. Expected 0x${expectedBundleHash.slice(0, 8)}…, got ${actualInput.slice(0, 10)}…`,
    };
  }

  if (expectedFrom && tx.from?.toLowerCase() !== expectedFrom.toLowerCase()) {
    return {
      valid: false,
      txHash,
      from: tx.from,
      reason: `Sender mismatch. Expected ${expectedFrom}, got ${tx.from}`,
    };
  }

  // Fetch block for timestamp
  let blockNumber: number | undefined;
  let timestamp: number | undefined;
  if (tx.blockNumber) {
    blockNumber = parseInt(tx.blockNumber, 16);
    try {
      const block = (await rpcCallWithFallback("eth_getBlockByNumber", [tx.blockNumber, false])) as Record<string, string> | null;
      if (block?.timestamp) timestamp = parseInt(block.timestamp, 16);
    } catch {
      // timestamp is optional
    }
  }

  return {
    valid: true,
    txHash,
    blockNumber,
    timestamp,
    from: tx.from,
  };
}
