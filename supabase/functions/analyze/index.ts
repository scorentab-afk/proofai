import { serve } from "https://deno.land/std@0.208.0/http/server.ts";
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

interface ThinkingStep {
  step_index: number;
  type: string;
  content: string;
  thought_signature?: string;
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

    const { executionId, analysisText, reasoningTrace, traceQuality } = await req.json();
    if (!executionId || !analysisText) {
      return new Response(
        JSON.stringify({ error: "executionId and analysisText are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── PATH A: Real Gemini thinking trace ─────────────────────────────────────
    // When reasoningTrace is provided (from Gemini 2.0 Flash Thinking), each
    // thinking segment becomes a real cognitive node with its actual content and hash.
    if (Array.isArray(reasoningTrace) && reasoningTrace.length > 0) {
      // Expand thinking blocks into paragraph-level nodes so long single-block
      // responses still yield multiple granular nodes.
      const rawNodes: Array<{ content: string; thought_signature?: string }> = [];

      for (const step of reasoningTrace as ThinkingStep[]) {
        const content = (step.content ?? "").trim();
        if (!content) continue;

        // Split by blank line — each paragraph is a distinct reasoning step
        const paragraphs = content
          .split(/\n\n+/)
          .map(p => p.trim())
          .filter(p => p.length > 15);

        if (paragraphs.length > 1) {
          // Multiple paragraphs → individual nodes (content is real, hash is fresh)
          for (const para of paragraphs) {
            rawNodes.push({ content: para });
          }
        } else {
          // Single block → keep as-is with the original thought_signature
          rawNodes.push({ content, thought_signature: step.thought_signature });
        }
      }

      const nodeTraceSource = traceQuality === "native" ? "native_thinking"
        : traceQuality === "native_thinking" ? "claude_extended_thinking"
        : "inferred_via_gemini";

      // Build cognitive nodes
      const nodes = await Promise.all(
        rawNodes.map(async (item, i) => {
          const content = item.content;
          // Reuse the existing signature or compute one from the real content
          const sig = item.thought_signature ?? await sha256(content);
          // First sentence as label (max 60 chars)
          const firstSentence = content.split(/(?<=[.!?])\s+/)[0].trim();
          const label = (firstSentence || content).substring(0, 60);
          return {
            id: `node_${i}`,
            label,
            type: "reasoning" as const,
            // Weight = relative length (longer reasoning = higher weight, capped at 1)
            weight: parseFloat(Math.min(1, content.length / 500).toFixed(2)),
            thought_signature: sig,
            traceSource: nodeTraceSource,
          };
        })
      );

      // Sequential chain: each step leads to the next
      const edges: Array<{ source: string; target: string; label: string; weight: number }> = [];
      for (let i = 1; i < nodes.length; i++) {
        edges.push({
          source: nodes[i - 1].id,
          target: nodes[i].id,
          label: "leads_to",
          weight: 1.0,
        });
      }

      const graphData = JSON.stringify({ nodes, edges });
      const cognitiveHash = await sha256(graphData);
      const id = `cog_${cognitiveHash.substring(0, 12)}_${Date.now()}`;

      // Native CoT is by definition a coherent sequential chain — score is 1.0
      const isNative = traceQuality === "native" || traceQuality === "native_thinking";

      return new Response(
        JSON.stringify({
          id,
          executionId,
          nodes,
          edges,
          metrics: {
            nodeCount: nodes.length,
            edgeCount: edges.length,
            consistencyScore: isNative ? 1.0 : parseFloat(Math.min(1, nodes.reduce((s, n) => s + n.weight, 0) / (nodes.length || 1) + 0.1).toFixed(2)),
            complexityScore: parseFloat(Math.min(1, edges.length / (nodes.length || 1)).toFixed(2)),
          },
          cognitiveHash,
          traceSource: traceQuality === "native" ? "native_thinking"
            : traceQuality === "native_thinking" ? "claude_extended_thinking"
            : "inferred_via_gemini",
          traceQuality: traceQuality ?? "inferred_via_gemini",
          ...(traceQuality === "inferred_via_gemini" ? {
            disclaimer: "Raisonnement inféré par analyse comparative Gemini Thinking — non natif",
          } : {}),
          timestamp: new Date().toISOString(),
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // ── PATH B: Synthetic graph from word frequency ─────────────────────────────
    // Used when no real thinking trace is available (Anthropic, OpenAI).
    const words = analysisText
      .replace(/[^a-zA-Z0-9\s]/g, "")
      .split(/\s+/)
      .filter((w: string) => w.length > 3);

    const freq: Record<string, number> = {};
    for (const w of words) {
      const lower = w.toLowerCase();
      freq[lower] = (freq[lower] || 0) + 1;
    }

    const sorted = Object.entries(freq)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12);

    const nodeTypes: Array<"concept" | "entity" | "action" | "relation"> = [
      "concept", "entity", "action", "relation",
    ];

    const nodes = sorted.map(([word, count], i) => ({
      id: `node_${i}`,
      label: word.charAt(0).toUpperCase() + word.slice(1),
      type: nodeTypes[i % nodeTypes.length],
      weight: parseFloat(Math.min(1, count / (sorted[0][1] || 1)).toFixed(2)),
    }));

    const edges: Array<{ source: string; target: string; label: string; weight: number }> = [];
    const edgeLabels = ["derives", "connects", "validates", "references"];

    for (let i = 1; i < nodes.length; i++) {
      const sourceIdx = Math.max(0, i - 1 - Math.floor(Math.random() * Math.min(3, i)));
      edges.push({
        source: nodes[sourceIdx].id,
        target: nodes[i].id,
        label: edgeLabels[i % edgeLabels.length],
        weight: parseFloat((0.5 + Math.random() * 0.5).toFixed(2)),
      });
    }

    if (nodes.length > 4) {
      for (let i = 0; i < Math.min(3, Math.floor(nodes.length / 3)); i++) {
        const s = Math.floor(Math.random() * nodes.length);
        let t = Math.floor(Math.random() * nodes.length);
        if (t === s) t = (t + 1) % nodes.length;
        edges.push({
          source: nodes[s].id,
          target: nodes[t].id,
          label: edgeLabels[Math.floor(Math.random() * edgeLabels.length)],
          weight: parseFloat((0.3 + Math.random() * 0.4).toFixed(2)),
        });
      }
    }

    const graphData = JSON.stringify({ nodes, edges });
    const cognitiveHash = await sha256(graphData);
    const id = `cog_${cognitiveHash.substring(0, 12)}_${Date.now()}`;

    const avgWeight = nodes.reduce((s, n) => s + n.weight, 0) / (nodes.length || 1);
    const edgeDensity = edges.length / (nodes.length * (nodes.length - 1) / 2 || 1);

    return new Response(
      JSON.stringify({
        id,
        executionId,
        nodes,
        edges,
        metrics: {
          nodeCount: nodes.length,
          edgeCount: edges.length,
          consistencyScore: parseFloat(Math.min(1, avgWeight + 0.3).toFixed(2)),
          complexityScore: parseFloat(Math.min(1, edgeDensity + 0.2).toFixed(2)),
        },
        cognitiveHash,
        traceSource: "synthetic",
        traceQuality: "output_hash",
        timestamp: new Date().toISOString(),
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
