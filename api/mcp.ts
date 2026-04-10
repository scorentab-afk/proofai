/**
 * ProofAI MCP Server — HTTP/JSON-RPC transport
 * Deployed as a Vercel Serverless Function at /api/mcp
 * Compatible with the MCP Streamable HTTP spec (JSON response mode)
 */

export const config = {
  runtime: "edge",
};

const API_BASE = process.env.PROOFAI_API_URL || "https://apzgbajvwzykygrxxrwm.supabase.co/functions/v1";
const API_KEY = process.env.PROOFAI_API_KEY || "";
const ANON_KEY = process.env.PROOFAI_ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFwemdiYWp2d3p5a3lncnh4cndtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MjU4ODksImV4cCI6MjA5MDIwMTg4OX0.iUxPxRxk8G2kNrtLnL_pSB-V7DE7cSclfpmsdP-FIJg";

const corsHeaders: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, Mcp-Session-Id",
  "Access-Control-Expose-Headers": "Mcp-Session-Id",
};

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

function rpcResult(id: unknown, result: unknown): Response {
  return jsonResponse({ jsonrpc: "2.0", id, result });
}

function rpcError(id: unknown, code: number, message: string): Response {
  return jsonResponse({ jsonrpc: "2.0", id, error: { code, message } });
}

async function callAPI(path: string, body: Record<string, unknown>): Promise<unknown> {
  const headers: Record<string, string> = { "Content-Type": "application/json" };
  if (API_KEY.startsWith("pk_live_")) headers["x-api-key"] = API_KEY;
  if (ANON_KEY) headers["Authorization"] = `Bearer ${ANON_KEY}`;

  const res = await fetch(`${API_BASE}/${path}`, {
    method: "POST",
    headers,
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`ProofAI API error ${res.status}: ${text}`);
  }
  return res.json();
}

// ---- Tool definitions ----

const TOOLS = [
  {
    name: "proofai_certify",
    description: "Certify an AI decision with cryptographic proof. Runs the full ProofAI pipeline: compress → execute → analyze → sign → bundle → anchor → verify. Returns a blockchain-verified evidence bundle.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "The AI prompt to certify" },
        provider: { type: "string", enum: ["anthropic", "openai", "gemini"], default: "anthropic", description: "AI provider" },
        temperature: { type: "number", default: 0.7, description: "Generation temperature" },
        maxTokens: { type: "number", default: 1024, description: "Max output tokens" },
      },
      required: ["prompt"],
    },
  },
  {
    name: "proofai_log",
    description: "Log an AI decision that already happened. Creates an evidence bundle with the prompt and response you provide, signs it with Ed25519, and anchors to Polygon.",
    inputSchema: {
      type: "object",
      properties: {
        prompt: { type: "string", description: "The original prompt" },
        response: { type: "string", description: "The AI response to log" },
        provider: { type: "string", default: "unknown", description: "Which AI provider generated the response" },
        model: { type: "string", default: "unknown", description: "Which model was used" },
      },
      required: ["prompt", "response"],
    },
  },
  {
    name: "proofai_verify",
    description: "Verify an evidence bundle's integrity and blockchain anchoring. Returns compliance checks against EU AI Act articles.",
    inputSchema: {
      type: "object",
      properties: {
        bundleId: { type: "string", description: "The bundle ID to verify (e.g., bnd_xxx)" },
      },
      required: ["bundleId"],
    },
  },
  {
    name: "proofai_polygonscan",
    description: "Get the Polygonscan verification URL for a transaction hash. Anyone can verify the proof independently.",
    inputSchema: {
      type: "object",
      properties: {
        txHash: { type: "string", description: "The Polygon transaction hash (0x...)" },
      },
      required: ["txHash"],
    },
  },
  {
    name: "proofai_monitor",
    description: "Get post-market monitoring statistics for AI compliance (EU AI Act Article 72). Shows anomalies, risk distribution, and compliance status.",
    inputSchema: {
      type: "object",
      properties: {},
      required: [],
    },
  },
];

// ---- Tool handlers ----

async function handleCertify(args: Record<string, unknown>): Promise<string> {
  const { prompt, provider = "anthropic", temperature = 0.7, maxTokens = 1024 } = args as {
    prompt: string; provider?: string; temperature?: number; maxTokens?: number;
  };

  const compressed = (await callAPI("compress", { prompt, options: { compressionLevel: "medium" } })) as { id: string };

  const execution = (await callAPI("execute", {
    promptRef: compressed.id,
    prompt,
    options: { provider, modelId: "auto", temperature, maxTokens },
  })) as {
    id: string; output: string;
    reasoning_trace: Array<{ step_index: number; type: string; content: string; thought_signature?: string }>;
    trace_quality: string;
    metadata: { provider: string; model: string; tokens: { total: number } };
  };

  const analysis = (await callAPI("analyze", {
    executionId: execution.id,
    analysisText: execution.output,
    reasoningTrace: execution.reasoning_trace ?? [],
    traceQuality: execution.trace_quality,
  })) as { id: string; cognitiveHash: string; metrics: { nodeCount: number; consistencyScore: number }; traceQuality: string; disclaimer?: string };

  const signature = (await callAPI("sign", {
    executionId: execution.id,
    rawOutput: execution.output,
    modelProvider: execution.metadata.provider,
    modelId: execution.metadata.model,
    modelVersion: "latest",
    modelParameters: { temperature },
    executionMetrics: { tokens: execution.metadata.tokens.total },
    requesterInfo: { source: "mcp-http" },
    timestamps: { request_received: new Date().toISOString() },
  })) as { signatureId: string };

  const bundle = (await callAPI("bundle", {
    promptId: compressed.id,
    executionId: execution.id,
    analysisId: analysis.id,
    signatureId: signature.signatureId,
    cognitiveHash: analysis.cognitiveHash,
    promptContent: prompt,
    aiResponse: execution.output,
    provider: execution.metadata.provider,
    model: execution.metadata.model,
    analysisData: analysis,
  })) as { id: string; bundleHash: string };

  let anchor: { transactionHash?: string; explorerUrl?: string; status?: string } = {};
  try {
    anchor = (await callAPI("anchor", { bundleId: bundle.id, network: "polygon" })) as typeof anchor;
  } catch { /* best-effort */ }

  const verification = (await callAPI("verify", { bundleId: bundle.id })) as { verified: boolean };

  const traceQuality = execution.trace_quality ?? "output_hash";
  const traceLabel =
    traceQuality === "native"
      ? `native (Gemini 2.5 Flash Extended Thinking — ${analysis.metrics.nodeCount} real thinking blocks)`
      : traceQuality === "native_thinking"
      ? `native_thinking (Claude Extended Thinking — ${analysis.metrics.nodeCount} real thinking blocks)`
      : traceQuality === "inferred_via_gemini"
      ? `inferred_via_gemini (reconstructed from ${execution.metadata.provider} response — ${analysis.metrics.nodeCount} steps)`
      : `output_hash (${analysis.metrics.nodeCount} node)`;

  return JSON.stringify({
    status: "certified",
    bundleId: bundle.id,
    bundleHash: bundle.bundleHash,
    verified: verification.verified,
    explorerUrl: anchor.explorerUrl || null,
    transactionHash: anchor.transactionHash || null,
    provider: execution.metadata.provider,
    model: execution.metadata.model,
    tokens: execution.metadata.tokens.total,
    cognitiveTrace: traceLabel,
    cognitiveNodes: analysis.metrics.nodeCount,
    consistencyScore: analysis.metrics.consistencyScore,
    traceQuality,
    ...(analysis.disclaimer ? { disclaimer: analysis.disclaimer } : {}),
    aiResponse: execution.output.substring(0, 500) + (execution.output.length > 500 ? "..." : ""),
  }, null, 2);
}

async function handleLog(args: Record<string, unknown>): Promise<string> {
  const { prompt, response, provider = "unknown", model = "unknown" } = args as {
    prompt: string; response: string; provider?: string; model?: string;
  };

  const compressed = (await callAPI("compress", { prompt, options: {} })) as { id: string };
  const analysis = (await callAPI("analyze", { executionId: `ext_${Date.now()}`, analysisText: response })) as { id: string; cognitiveHash: string };
  const signature = (await callAPI("sign", {
    executionId: `ext_${Date.now()}`,
    rawOutput: response,
    modelProvider: provider,
    modelId: model,
    modelVersion: "external",
    modelParameters: {},
    executionMetrics: {},
    requesterInfo: { source: "mcp-http-log" },
    timestamps: { logged_at: new Date().toISOString() },
  })) as { signatureId: string };
  const bundle = (await callAPI("bundle", {
    promptId: compressed.id,
    executionId: `ext_${Date.now()}`,
    analysisId: analysis.id,
    signatureId: signature.signatureId,
    cognitiveHash: analysis.cognitiveHash,
    promptContent: prompt,
    aiResponse: response,
    provider,
    model,
    analysisData: analysis,
  })) as { id: string; bundleHash: string };

  let explorerUrl: string | null = null;
  try {
    const anchor = (await callAPI("anchor", { bundleId: bundle.id, network: "polygon" })) as { explorerUrl: string };
    explorerUrl = anchor.explorerUrl;
  } catch { /* best-effort */ }

  return `Logged and certified.\n\nBundle ID: ${bundle.id}\nBundle Hash: ${bundle.bundleHash}\nPolygonscan: ${explorerUrl || "pending"}\n\nThis decision is now tamper-evident and blockchain-anchored.`;
}

async function handleVerify(args: Record<string, unknown>): Promise<string> {
  const { bundleId } = args as { bundleId: string };
  const result = (await callAPI("verify", { bundleId })) as {
    bundleId: string; verified: boolean; checks: Record<string, boolean>;
    ledgerInfo?: { transactionHash: string; blockNumber: number; network: string };
  };
  const checksText = Object.entries(result.checks).map(([k, v]) => `  ${v ? "✅" : "❌"} ${k}`).join("\n");
  return `Bundle: ${result.bundleId}\nVerified: ${result.verified ? "✅ YES" : "❌ NO"}\n\nChecks:\n${checksText}${
    result.ledgerInfo
      ? `\n\nBlockchain:\n  Network: ${result.ledgerInfo.network}\n  Block: #${result.ledgerInfo.blockNumber}\n  Tx: ${result.ledgerInfo.transactionHash}`
      : ""
  }`;
}

function handlePolygonscan(args: Record<string, unknown>): string {
  const { txHash } = args as { txHash: string };
  return `Polygonscan verification URL:\nhttps://polygonscan.com/tx/${txHash}\n\nAnyone can verify this proof — no account, no login, no middleman. Just math.`;
}

async function handleMonitor(): Promise<string> {
  const stats = await callAPI("monitor", {});
  return JSON.stringify(stats, null, 2);
}

// ---- MCP request router ----

async function handleToolCall(name: string, args: Record<string, unknown>): Promise<{ content: Array<{ type: string; text: string }>; isError?: boolean }> {
  try {
    let text: string;
    if (name === "proofai_certify") text = await handleCertify(args);
    else if (name === "proofai_log") text = await handleLog(args);
    else if (name === "proofai_verify") text = await handleVerify(args);
    else if (name === "proofai_polygonscan") text = handlePolygonscan(args);
    else if (name === "proofai_monitor") text = await handleMonitor();
    else throw new Error(`Unknown tool: ${name}`);
    return { content: [{ type: "text", text }] };
  } catch (err) {
    return { content: [{ type: "text", text: `Error: ${(err as Error).message}` }], isError: true };
  }
}

// ---- Main handler ----

export default async function handler(request: Request): Promise<Response> {
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method === "GET") {
    // Health check / capability discovery
    return jsonResponse({
      name: "proofai",
      version: "1.0.0",
      description: "ProofAI MCP Server — AI compliance certification tools",
      tools: TOOLS.map(t => ({ name: t.name, description: t.description })),
      endpoint: "/api/mcp",
    });
  }

  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405, headers: corsHeaders });
  }

  let body: { jsonrpc: string; id: unknown; method: string; params?: Record<string, unknown> };
  try {
    body = await request.json();
  } catch {
    return rpcError(null, -32700, "Parse error");
  }

  const { id, method, params = {} } = body;

  // MCP protocol methods
  if (method === "initialize") {
    return rpcResult(id, {
      protocolVersion: "2024-11-05",
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: "proofai", version: "1.0.0" },
    });
  }

  if (method === "notifications/initialized") {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (method === "ping") {
    return rpcResult(id, {});
  }

  if (method === "tools/list") {
    return rpcResult(id, { tools: TOOLS });
  }

  if (method === "tools/call") {
    const { name, arguments: args = {} } = params as { name: string; arguments?: Record<string, unknown> };
    const result = await handleToolCall(name, args);
    return rpcResult(id, result);
  }

  return rpcError(id, -32601, `Method not found: ${method}`);
}
