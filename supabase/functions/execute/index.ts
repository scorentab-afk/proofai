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

interface ReasoningStep {
  step_index: number;
  type: string;
  content: string;
  thought_signature?: string;
}

type TraceQuality = "native" | "native_thinking" | "inferred_via_gemini" | "output_hash";

interface ExecuteResult {
  output: string;
  trace: ReasoningStep[];
  tokens: { prompt: number; completion: number; total: number };
  traceQuality: TraceQuality;
}

// ─────────────────────────────────────────────────────────────────────────────
// Shared: extract real thinking blocks from a Gemini Thinking API response
// ─────────────────────────────────────────────────────────────────────────────
async function extractGeminiThinking(
  apiKey: string,
  promptText: string,
  temperature: number,
  maxOutputTokens: number,
  model = "gemini-2.5-flash",
): Promise<{ thinking: ReasoningStep[]; output: string; inputTokens: number; outputTokens: number; thoughtsTokens: number }> {
  const isThinkingModel = model.startsWith("gemini-2.5");
  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: promptText }] }],
        generationConfig: {
          temperature,
          maxOutputTokens,
          ...(isThinkingModel ? { thinkingConfig: { includeThoughts: true } } : {}),
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google AI API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const parts: Array<{ text?: string; thought?: boolean }> =
    data.candidates?.[0]?.content?.parts ?? [];

  const thinkingParts = parts.filter(p => p.thought === true);
  const responseParts = parts.filter(p => !p.thought);
  const output = responseParts.map(p => p.text ?? "").join("");

  const thinking: ReasoningStep[] = [];
  for (let i = 0; i < thinkingParts.length; i++) {
    const content = thinkingParts[i].text ?? "";
    const sig = await sha256(content);
    thinking.push({ step_index: i, type: "reasoning", content, thought_signature: sig });
  }

  // Fallback if model returns no thinking blocks
  if (thinking.length === 0 && output) {
    const sig = await sha256(output);
    thinking.push({ step_index: 0, type: "text", content: output, thought_signature: sig });
  }

  return {
    thinking,
    output,
    inputTokens: data.usageMetadata?.promptTokenCount ?? 0,
    outputTokens: data.usageMetadata?.candidatesTokenCount ?? 0,
    thoughtsTokens: data.usageMetadata?.thoughtsTokenCount ?? 0,
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Tier 2: after getting a non-Gemini response, ask Gemini Thinking to infer
// the reasoning chain that most likely produced that output.
// ─────────────────────────────────────────────────────────────────────────────
async function inferReasoningViaGemini(
  originalPrompt: string,
  aiResponse: string,
  providerName: string,
): Promise<ReasoningStep[]> {
  const apiKey = Deno.env.get("GOOGLE_AI_API_KEY");
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY not set — cannot infer reasoning");

  const inferencePrompt =
    `You are performing a deep cognitive analysis of an AI response.\n\n` +
    `ORIGINAL PROMPT:\n${originalPrompt}\n\n` +
    `AI RESPONSE (provider: ${providerName}):\n${aiResponse}\n\n` +
    `Task: Reconstruct the internal step-by-step reasoning chain that most likely produced ` +
    `this response. Think through: what information did the model need to process? What logical ` +
    `steps did it follow? What considerations, trade-offs, and knowledge shaped the answer? ` +
    `Provide a detailed, faithful reconstruction of the probable cognitive process.`;

  const { thinking } = await extractGeminiThinking(
    apiKey,
    inferencePrompt,
    0.3,   // low temperature for analytical reconstruction
    8192,
    "gemini-2.0-flash",  // stable fallback for Tier 2 inference
  );

  // Re-index steps (they may come from a multi-block thinking response)
  return thinking.map((s, i) => ({ ...s, step_index: i }));
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider implementations
// ─────────────────────────────────────────────────────────────────────────────

async function callAnthropic(prompt: string, options: Record<string, unknown>): Promise<ExecuteResult> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const budgetTokens = 5000;
  const maxTokens = Math.max((options.maxTokens as number) || 1024, budgetTokens + 1024);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "interleaved-thinking-2025-05-14",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: (!options.modelId || options.modelId === "auto") ? "claude-sonnet-4-20250514" : (options.modelId as string),
      max_tokens: maxTokens,
      temperature: 1, // required when extended thinking is enabled
      thinking: { type: "enabled", budget_tokens: budgetTokens },
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const content: Array<{ type: string; thinking?: string; text?: string }> = data.content ?? [];

  // Extract native thinking blocks
  const thinkingBlocks = content.filter(b => b.type === "thinking");
  const output = content.filter(b => b.type === "text").map(b => b.text ?? "").join("");
  const inputTokens = data.usage?.input_tokens ?? 0;
  const outputTokens = data.usage?.output_tokens ?? 0;

  const trace: ReasoningStep[] = [];
  for (let i = 0; i < thinkingBlocks.length; i++) {
    const thinking = thinkingBlocks[i].thinking ?? "";
    const sig = await sha256(thinking);
    trace.push({ step_index: i, type: "reasoning", content: thinking, thought_signature: sig });
  }

  // Fallback: if no thinking blocks, hash the output
  if (trace.length === 0) {
    const sig = await sha256(output);
    trace.push({ step_index: 0, type: "text", content: output, thought_signature: sig });
  }

  return {
    output,
    trace,
    tokens: { prompt: inputTokens, completion: outputTokens, total: inputTokens + outputTokens },
    traceQuality: trace.length > 0 && thinkingBlocks.length > 0 ? "native_thinking" : "output_hash",
  };
}

async function callOpenAI(prompt: string, options: Record<string, unknown>): Promise<ExecuteResult> {
  const apiKey = Deno.env.get("OPENAI_API_KEY");
  if (!apiKey) throw new Error("OPENAI_API_KEY not set");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: (!options.modelId || options.modelId === "auto") ? "gpt-4o" : (options.modelId as string),
      max_tokens: (options.maxTokens as number) || 1024,
      temperature: (options.temperature as number) ?? 0.7,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`OpenAI API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const output = data.choices?.[0]?.message?.content ?? "";
  const inputTokens = data.usage?.prompt_tokens ?? 0;
  const outputTokens = data.usage?.completion_tokens ?? 0;

  // Tier 2: infer reasoning via Gemini Thinking
  let trace: ReasoningStep[];
  let traceQuality: TraceQuality;
  try {
    trace = await inferReasoningViaGemini(prompt, output, "OpenAI GPT");
    traceQuality = "inferred_via_gemini";
  } catch {
    const sig = await sha256(output);
    trace = [{ step_index: 0, type: "text", content: output, thought_signature: sig }];
    traceQuality = "output_hash";
  }

  return { output, trace, tokens: { prompt: inputTokens, completion: outputTokens, total: inputTokens + outputTokens }, traceQuality };
}

async function callGemini(prompt: string, options: Record<string, unknown>): Promise<ExecuteResult> {
  const apiKey = Deno.env.get("GOOGLE_AI_API_KEY");
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY not set");

  const { thinking, output, inputTokens, outputTokens, thoughtsTokens } =
    await extractGeminiThinking(
      apiKey,
      prompt,
      (options.temperature as number) ?? 0.7,
      (options.maxTokens as number) || 8192,
    );

  return {
    output,
    trace: thinking,
    tokens: { prompt: inputTokens, completion: outputTokens, total: inputTokens + outputTokens + thoughtsTokens },
    traceQuality: "native",
  };
}

// ─────────────────────────────────────────────────────────────────────────────
// Handler
// ─────────────────────────────────────────────────────────────────────────────

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
    const { promptRef, prompt, originalPrompt, options } = body;
    if (!promptRef || !options?.provider) {
      return new Response(
        JSON.stringify({ error: "promptRef and options.provider are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const promptText = prompt || originalPrompt || options?.originalPrompt || promptRef;

    const startTime = Date.now();
    const provider = options.provider;
    const isGemini = provider === "gemini" || provider === "google";
    const isClaude = provider === "anthropic";

    let result: ExecuteResult;
    if (isGemini) {
      result = await callGemini(promptText, options);
    } else if (isClaude) {
      result = await callAnthropic(promptText, options);
    } else {
      result = await callOpenAI(promptText, options);
    }

    const latency = Date.now() - startTime;
    const hash = await sha256(`${promptRef}_${result.output}_${Date.now()}`);
    const id = `exec_${hash.substring(0, 12)}_${Date.now()}`;

    return new Response(
      JSON.stringify({
        id,
        promptRef,
        output: result.output,
        metadata: {
          provider: options.provider,
          model: options.modelId || "default",
          latency,
          tokens: result.tokens,
        },
        reasoning_trace: result.trace,
        trace_quality: result.traceQuality,
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
