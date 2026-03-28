# ProofAI — Instructions for AI Agents

## Stack
- Frontend: React + TypeScript + Vite + Tailwind + shadcn/ui
- Backend: Supabase Edge Functions (Deno)
- Crypto: @noble/ed25519
- Blockchain: Polygon Amoy via Alchemy

## Rules
- NEVER modify src/components/ or src/pages/
- NEVER modify src/lib/ed25519-verify.ts or src/lib/thought-signature.ts
- ALWAYS keep all TypeScript interfaces in src/api/client.ts intact
- Edge Functions use Deno runtime — use esm.sh for imports, not npm

## Architecture
src/api/client.ts → callEdge() → Supabase Edge Functions → Supabase DB + Polygon

## EU AI Act compliance coverage
- Art. 12: automatic logging ✅
- Art. 12: 6-month retention ✅
- Art. 12: subject identification (hashed) ✅
- Art. 12: RAG source tracking ✅
- Art. 14: human oversight logging ✅
- Art. 19: tamper-evident logs + blockchain ✅
- Art. 72: post-market monitoring ✅
- GDPR Art. 17: crypto-shredding ✅
