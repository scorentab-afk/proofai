# ProofAI — Instructions for AI Agents

## Stack
- Frontend: React + TypeScript + Vite + Tailwind + shadcn/ui
- Backend: Supabase Edge Functions (Deno)
- Crypto: @noble/ed25519, @noble/curves (secp256k1 for EIP-155), @noble/hashes (keccak256)
- Blockchain: Polygon PoS mainnet via Alchemy (eth_sendRawTransaction, EIP-155 signed)

## Rules
- NEVER modify src/components/ or src/pages/
- NEVER modify src/lib/ed25519-verify.ts or src/lib/thought-signature.ts
- ALWAYS keep all TypeScript interfaces in src/api/client.ts intact
- Edge Functions use Deno runtime — use esm.sh for imports, not npm

## Architecture
src/api/client.ts → callEdge() → Supabase Edge Functions → Supabase DB + Polygon

## Pipeline

```
compress → execute → analyze → sign → bundle → anchor → verify
```

1. **compress** (Art. 12) — tokenize prompt to DSL + SHA-256 hash
2. **execute** (Art. 12) — real AI call; two-tier cognitive trace:
   - Gemini provider: `gemini-2.0-flash-thinking-exp-1219`, real `thought: true` blocks → `trace_quality: "native"`
   - Claude/GPT: call provider, then call Gemini Thinking to infer reasoning → `trace_quality: "inferred_via_gemini"`
   - Fallback (no GOOGLE_AI_API_KEY): SHA-256 of output → `trace_quality: "output_hash"`
3. **analyze** (Art. 12) — cognitive graph from thinking trace; paragraph-level nodes, sequential edges
4. **sign** (Art. 19) — Ed25519 signature of execution payload
5. **bundle** (Art. 12) — assemble evidence bundle; uses `stableStringify()` for deterministic SHA-256
6. **anchor** (Art. 19) — EIP-155 raw transaction → Polygon PoS mainnet via `eth_sendRawTransaction`
7. **verify** (Art. 19) — Ed25519 check + blockchain lookup + hash chain validation

## EU AI Act compliance coverage
- Art. 12: automatic logging ✅
- Art. 12: 6-month retention ✅
- Art. 12: subject identification (hashed) ✅
- Art. 12: RAG source tracking ✅
- Art. 12: reasoning trace (native or inferred via Gemini Thinking) ✅
- Art. 14: human oversight logging ✅
- Art. 19: tamper-evident logs + Ed25519 signature + blockchain anchor ✅
- Art. 72: post-market monitoring ✅
- GDPR Art. 17: crypto-shredding ✅

## Key implementation details
- `stableStringify()` in bundle/index.ts — sorts all JSON keys recursively; required because PostgreSQL JSONB reorders keys alphabetically, which would break client-side SHA-256 recomputation
- `buildSignedTx()` in anchor/index.ts — full EIP-155 signing with secp256k1 + RLP encoding; Alchemy does not support `eth_sendTransaction`
- Regulator portal — `reg_*` token prefix grants full content access without DB lookup; used by CNIL, ACPR, ARCOM, etc.
