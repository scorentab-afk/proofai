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

async function callAnthropic(prompt: string, options: Record<string, unknown>): Promise<{ output: string; trace: ReasoningStep[]; tokens: { prompt: number; completion: number; total: number } }> {
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) throw new Error("ANTHROPIC_API_KEY not set");

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "content-type": "application/json",
    },
    body: JSON.stringify({
      model: (!options.modelId || options.modelId === "auto") ? "claude-sonnet-4-20250514" : (options.modelId as string),
      max_tokens: (options.maxTokens as number) || 1024,
      temperature: (options.temperature as number) ?? 0.7,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Anthropic API error ${res.status}: ${err}`);
  }

  const data = await res.json();
  const output = data.content?.[0]?.text ?? "";
  const inputTokens = data.usage?.input_tokens ?? 0;
  const outputTokens = data.usage?.output_tokens ?? 0;

  // Anthropic doesn't expose chain-of-thought externally; record the output hash as a single node
  const sig = await sha256(output);
  const trace: ReasoningStep[] = [
    { step_index: 0, type: "text", content: output, thought_signature: sig },
  ];

  return { output, trace, tokens: { prompt: inputTokens, completion: outputTokens, total: inputTokens + outputTokens } };
}

async function callOpenAI(prompt: string, options: Record<string, unknown>): Promise<{ output: string; trace: ReasoningStep[]; tokens: { prompt: number; completion: number; total: number } }> {
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

  // OpenAI doesn't expose chain-of-thought externally; record the output hash as a single node
  const sig = await sha256(output);
  const trace: ReasoningStep[] = [
    { step_index: 0, type: "text", content: output, thought_signature: sig },
  ];

  return { output, trace, tokens: { prompt: inputTokens, completion: outputTokens, total: inputTokens + outputTokens } };
}

async function callGemini(prompt: string, options: Record<string, unknown>): Promise<{ output: string; trace: ReasoningStep[]; tokens: { prompt: number; completion: number; total: number } }> {
  const apiKey = Deno.env.get("GOOGLE_AI_API_KEY");
  if (!apiKey) throw new Error("GOOGLE_AI_API_KEY not set");

  // Use Gemini 2.0 Flash Thinking — returns real chain-of-thought in thought: true parts
  const model = (!options.modelId || options.modelId === "auto")
    ? "gemini-2.0-flash-thinking-exp-1219"
    : (options.modelId as string);

  const res = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: (options.temperature as number) ?? 0.7,
          maxOutputTokens: (options.maxTokens as number) || 8192,
        },
      }),
    }
  );

  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Google AI API error ${res.status}: ${err}`);
  }

  const data = await res.json();

  // Gemini Thinking returns parts with thought: true for reasoning and without for the final answer
  const parts: Array<{ text?: string; thought?: boolean }> =
    data.candidates?.[0]?.content?.parts ?? [];

  const thinkingParts = parts.filter(p => p.thought === true);
  const responseParts = parts.filter(p => !p.thought);
  const output = responseParts.map(p => p.text ?? "").join("");

  const inputTokens = data.usageMetadata?.promptTokenCount ?? 0;
  const outputTokens = data.usageMetadata?.candidatesTokenCount ?? 0;
  const thoughtsTokens = data.usageMetadata?.thoughtsTokenCount ?? 0;

  // Build real cognitive trace — each thinking segment hashed individually
  const trace: ReasoningStep[] = [];
  for (let i = 0; i < thinkingParts.length; i++) {
    const content = thinkingParts[i].text ?? "";
    const sig = await sha256(content); // hash of the real thinking content
    trace.push({
      step_index: i,
      type: "reasoning",
      content,
      thought_signature: sig,
    });
  }

  // Fallback: model returned no thinking blocks (shouldn't happen with thinking model)
  if (trace.length === 0) {
    const sig = await sha256(output);
    trace.push({ step_index: 0, type: "text", content: output, thought_signature: sig });
  }

  return {
    output,
    trace,
    tokens: {
      prompt: inputTokens,
      completion: outputTokens,
      total: inputTokens + outputTokens + thoughtsTokens,
    },
  };
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

    const body = await req.json();
    const { promptRef, prompt, originalPrompt, options } = body;
    if (!promptRef || !options?.provider) {
      return new Response(
        JSON.stringify({ error: "promptRef and options.provider are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use the original prompt text if provided, otherwise fall back to promptRef
    const promptText = prompt || originalPrompt || options?.originalPrompt || promptRef;

    const startTime = Date.now();
    const provider = options.provider;
    const isGemini = provider === "gemini" || provider === "google";
    const isClaude = provider === "anthropic";

    let result: { output: string; trace: ReasoningStep[]; tokens: { prompt: number; completion: number; total: number } };

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

    const response = {
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
      // native_thinking = real Gemini thinking blocks; output_hash = hashed final output only
      trace_quality: isGemini ? "native_thinking" : "output_hash",
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
