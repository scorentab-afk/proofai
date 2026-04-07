# proofai

Cryptographic proof that AI thought before it answered.

EU AI Act compliance with blockchain anchoring on Polygon PoS mainnet.

## Install

```bash
pip install proofai
```

## Quick Start

```python
from proofai import ProofAI

client = ProofAI(api_key="pk_live_...")

cert = client.certify("Analyse the legal risks of this SaaS contract")

print(cert.verified)         # True
print(cert.bundle_id)        # bnd_8019b37a7f44_...
print(cert.bundle_hash)      # sha256 hash
print(cert.explorer_url)     # https://polygonscan.com/tx/0x...
print(cert.trace_quality)    # "inferred_via_gemini"
print(cert.cognitive_nodes)  # 7
```

### Environment variables

```bash
export PROOFAI_ANON_KEY="pk_live_..."
```

```python
from proofai import certify, verify, log

# One-shot certification
cert = certify("Analyse the legal risks of this SaaS contract")

# Verify an existing bundle
result = verify("bnd_8019b37a7f44_...")
print(result.verified)  # True

# Audit log a decision (no blockchain anchoring)
bundle = log("Loan application auto-rejected", {"subject": "user_123"})
print(bundle.id)
```

## Context manager

```python
from proofai import ProofAI, CertifyOptions

with ProofAI(api_key="pk_live_...") as client:
    cert = client.certify(
        "Summarise the GDPR implications of this data sharing agreement",
        CertifyOptions(provider="anthropic"),
    )
    assert cert.verified
```

## Cognitive Analysis — Two-tier System

ProofAI captures real AI reasoning as evidence, not just the final output.

**Tier 1 — Native (Gemini provider only)**

When `provider="gemini"`, ProofAI calls `gemini-2.0-flash-thinking-exp-1219` and
extracts real `thought: true` blocks. Each thinking segment becomes a cognitive
node with its actual content and SHA-256 hash. `trace_quality = "native"`.

**Tier 2 — Inferred (Claude, GPT, all others)**

When `provider="anthropic"` or `"openai"`, ProofAI calls the provider for the
response, then calls Gemini Thinking to reconstruct the reasoning chain that most
likely produced it. `trace_quality = "inferred_via_gemini"`. A `disclaimer` field
is set noting the trace is inferred.

**Fallback**

If `GOOGLE_AI_API_KEY` is not configured server-side, a single SHA-256 hash of the
output is recorded. `trace_quality = "output_hash"`.

```python
cert = client.certify("Your prompt", CertifyOptions(provider="gemini"))

# Access individual cognitive nodes
for node in cert.steps.analyze.nodes:
    print(node.label)          # First sentence of the reasoning step
    print(node.hash)           # SHA-256 of the node content
    print(node.trace_source)   # "native_thinking" | "inferred_via_gemini"
```

## Step-by-Step Pipeline

```python
from proofai import ProofAI

client = ProofAI(api_key="pk_live_...")

# 1. Compress prompt to canonical DSL
compressed = client.compress("Your prompt here", compression_level="medium")

# 2. Execute AI (captures reasoning_trace + trace_quality)
execution = client.execute(
    compressed.id,
    provider="anthropic",
    temperature=0.7,
    max_tokens=1024,
)

# 3. Cognitive analysis — pass the real thinking trace
analysis = client.analyze(
    execution.id,
    execution.output,
    execution.reasoning_trace,
    execution.trace_quality,
)

# 4. Sign with Ed25519
signature = client.sign(execution)

# 5. Create evidence bundle
bundle = client.bundle(
    compressed.id,
    execution.id,
    analysis.id,
    signature.signature_id,
    analysis.cognitive_hash,
)

# 6. Anchor to Polygon PoS mainnet
anchor = client.anchor(bundle.id, network="polygon")
print(anchor.explorer_url)  # https://polygonscan.com/tx/0x...

# 7. Verify
verification = client.verify(bundle.id)
print(verification.verified)  # True
```

## `certify()` Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `provider` | `"anthropic" \| "openai" \| "gemini"` | `"anthropic"` | AI provider |
| `model_id` | `str` | auto | Model override |
| `temperature` | `float` | `0.7` | Generation temperature |
| `max_tokens` | `int` | `1024` | Max output tokens |
| `compression_level` | `"low" \| "medium" \| "high"` | `"medium"` | DSL compression level |
| `network` | `"polygon" \| "ethereum"` | `"polygon"` | Blockchain network |
| `skip_anchor` | `bool` | `False` | Skip blockchain anchoring |

```python
from proofai import ProofAI, CertifyOptions

cert = client.certify(
    "Your prompt",
    CertifyOptions(
        provider="gemini",
        temperature=0.5,
        max_tokens=2048,
        network="polygon",
    ),
)
```

## Human Review (EU AI Act Art. 14)

```python
review = client.review(
    bundle_id=cert.bundle_id,
    reviewer_id="officer@example.com",
    role="compliance_officer",
    decision="approved",
    notes="Reviewed and approved for production use.",
)
print(review.decision)  # "approved"
```

## Monitoring

```python
stats = client.monitor()
print(stats.total_executions)
print(stats.anomaly_count)
print(stats.compliance)
```

## Self-Hosted

```python
client = ProofAI(
    api_key="your-supabase-anon-key",
    base_url="https://your-project.supabase.co/functions/v1",
)
```

## License

MIT
