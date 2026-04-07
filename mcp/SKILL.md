# proofai

Cryptographic proof that AI thought before it answered. EU AI Act Article 12 compliant.

## VirusTotal Notice

This skill is flagged by VirusTotal because it:
- Handles Ed25519 cryptographic keys (by design)
- Calls external APIs (Polygon blockchain, Supabase)
- Anchors data on-chain (Polygon PoS mainnet)

This is expected behavior for a blockchain compliance tool.
Review the source: https://github.com/proof-ai/proofai

## Tools

### proofai_certify
Certify an AI decision with cryptographic proof. Runs the full ProofAI pipeline: compress → execute AI → two-tier cognitive analysis → sign with Ed25519 → bundle evidence → anchor to Polygon blockchain → verify. Returns a blockchain-verified evidence bundle with Polygonscan URL.

**Pipeline details:**
1. `compress` — tokenize prompt to DSL + SHA-256 hash
2. `execute` — real AI call (Claude, Gemini, or GPT)
3. `analyze` — two-tier cognitive graph:
   - **Tier 1 (Gemini):** native `thought: true` blocks from Gemini 2.0 Flash Thinking → `trace_quality: "native"`
   - **Tier 2 (Claude/GPT):** Gemini Thinking reconstructs the reasoning chain → `trace_quality: "inferred_via_gemini"`
4. `sign` — Ed25519 signature of the execution
5. `bundle` — assemble evidence bundle with SHA-256 hash
6. `anchor` — write bundle hash to Polygon PoS mainnet (EIP-155 signed raw transaction)
7. `verify` — check signature + blockchain + hash chain

**When to use:** When you need tamper-evident proof of an AI decision for compliance, audit, or legal purposes.

**Output includes:**
- `bundleId` / `bundleHash` — evidence bundle reference
- `verified` — true if all integrity checks pass
- `explorerUrl` — Polygonscan URL for independent verification
- `traceQuality` — `"native"` | `"inferred_via_gemini"` | `"output_hash"`
- `disclaimer` — present when trace is inferred (not native Gemini thinking)
- `cognitiveNodes` — number of reasoning steps extracted

### proofai_log
Log an AI decision that already happened. Provide the original prompt and AI response — ProofAI signs it with Ed25519, bundles the evidence, and anchors the hash to Polygon. No AI execution needed.

**When to use:** When you want to retroactively certify an AI interaction that already occurred.

### proofai_verify
Verify an evidence bundle's integrity and blockchain anchoring. Checks data integrity, timestamp validity, ledger anchoring, and hash matching against EU AI Act requirements (Art. 12, 14, 19).

**When to use:** When you need to confirm a bundle hasn't been tampered with.

### proofai_polygonscan
Get the Polygonscan verification URL for a Polygon transaction hash. Anyone can independently verify the proof without an account.

**When to use:** When you need to share a verification link with a regulator, client, or auditor.

### proofai_monitor
Get post-market monitoring statistics for AI compliance (EU AI Act Article 72). Returns anomaly counts, risk distribution, human review stats, and overall compliance status for the last 30 days.

**When to use:** When you need a compliance health check of your AI system.

## Setup

```json
{
  "mcpServers": {
    "proofai": {
      "command": "npx",
      "args": ["-y", "@proofai/mcp-server"],
      "env": {
        "PROOFAI_API_KEY": "pk_live_xxx",
        "PROOFAI_ANON_KEY": "your-supabase-anon-key"
      }
    }
  }
}
```

Or via clawhub:

```bash
npx clawhub@latest install proofai
```

## Links

- GitHub: https://github.com/proof-ai/proofai
- npm SDK: https://www.npmjs.com/package/@proofai/sdk
- Regulator Portal: https://proofai-ochre.vercel.app/regulator
