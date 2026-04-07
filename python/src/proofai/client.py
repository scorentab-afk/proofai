"""ProofAI Python client."""

from __future__ import annotations

import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import requests

from .types import (
    AnchorResult,
    AnalyzeResult,
    BundleOptions,
    BundleResult,
    Certificate,
    CertifyOptions,
    CompressResult,
    ExecuteResult,
    HumanReviewResult,
    MonitoringStats,
    Network,
    Provider,
    SignResult,
    VerifyResult,
)

DEFAULT_BASE_URL = "https://apzgbajvwzykygrxxrwm.supabase.co/functions/v1"

_MODEL_DEFAULTS: Dict[str, str] = {
    "anthropic": "claude-sonnet-4-20250514",
    "openai": "gpt-4-turbo",
    "gemini": "gemini-2.0-flash",
    "google": "gemini-2.0-flash",
}


class ProofAIError(Exception):
    """Raised when the ProofAI API returns an error response."""

    def __init__(self, status_code: int, message: str) -> None:
        self.status_code = status_code
        super().__init__(f"ProofAI API error {status_code}: {message}")


class ProofAI:
    """
    ProofAI client — cryptographic proof that AI thought before it answered.

    Usage::

        from proofai import ProofAI

        client = ProofAI(api_key="pk_live_...")
        cert = client.certify("Analyse the legal risks of this SaaS contract")

        print(cert.verified)         # True
        print(cert.bundle_id)        # bnd_8019b37a7f44_...
        print(cert.bundle_hash)      # sha256 hash
        print(cert.explorer_url)     # https://polygonscan.com/tx/0x...
        print(cert.trace_quality)    # "inferred_via_gemini"
        print(cert.cognitive_nodes)  # 7

    The client can also be used as a context manager::

        with ProofAI(api_key="pk_live_...") as client:
            cert = client.certify("Your prompt here")
    """

    def __init__(
        self,
        api_key: Optional[str] = None,
        base_url: Optional[str] = None,
        timeout: int = 120,
    ) -> None:
        """
        Create a ProofAI client.

        Args:
            api_key: Your ProofAI API key. Falls back to the ``PROOFAI_ANON_KEY``
                     environment variable.
            base_url: Override the API base URL. Falls back to ``PROOFAI_API_URL``
                      then the hosted Supabase endpoint.
            timeout: HTTP request timeout in seconds (default: 120).
        """
        resolved_key = api_key or os.environ.get("PROOFAI_ANON_KEY")
        if not resolved_key:
            raise ValueError(
                "ProofAI: api_key is required. "
                "Pass it directly or set the PROOFAI_ANON_KEY environment variable."
            )
        self._api_key = resolved_key
        self._base_url = (
            (base_url or os.environ.get("PROOFAI_API_URL") or DEFAULT_BASE_URL).rstrip("/")
        )
        self._timeout = timeout
        self._session = requests.Session()

    # ------------------------------------------------------------------
    # Context manager support
    # ------------------------------------------------------------------

    def __enter__(self) -> "ProofAI":
        return self

    def __exit__(self, *_: Any) -> None:
        self.close()

    def close(self) -> None:
        """Close the underlying HTTP session."""
        self._session.close()

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _headers(self) -> Dict[str, str]:
        headers = {"Content-Type": "application/json"}
        if self._api_key.startswith("pk_live_"):
            headers["x-api-key"] = self._api_key
        else:
            headers["Authorization"] = f"Bearer {self._api_key}"
        return headers

    def _call(self, path: str, body: Dict[str, Any]) -> Any:
        url = f"{self._base_url}/{path}"
        response = self._session.post(
            url,
            json=body,
            headers=self._headers(),
            timeout=self._timeout,
        )
        if not response.ok:
            raise ProofAIError(response.status_code, response.text)
        return response.json()

    # ------------------------------------------------------------------
    # Individual pipeline steps
    # ------------------------------------------------------------------

    def compress(
        self,
        prompt: str,
        compression_level: str = "medium",
        preserve_context: bool = True,
        target_models: Optional[List[str]] = None,
    ) -> CompressResult:
        """Compress a prompt into a canonical DSL representation."""
        options: Dict[str, Any] = {
            "compressionLevel": compression_level,
            "preserveContext": preserve_context,
        }
        if target_models:
            options["targetModels"] = target_models
        data = self._call("compress", {"prompt": prompt, "options": options})
        return CompressResult.from_dict(data)

    def execute(
        self,
        prompt_ref: str,
        provider: Provider = "anthropic",
        model_id: Optional[str] = None,
        temperature: float = 0.7,
        max_tokens: int = 1024,
    ) -> ExecuteResult:
        """Execute the AI model and capture the reasoning trace."""
        data = self._call(
            "execute",
            {
                "promptRef": prompt_ref,
                "options": {
                    "provider": provider,
                    "modelId": model_id or _MODEL_DEFAULTS.get(provider, "gpt-4-turbo"),
                    "temperature": temperature,
                    "maxTokens": max_tokens,
                },
            },
        )
        return ExecuteResult.from_dict(data)

    def analyze(
        self,
        execution_id: str,
        analysis_text: str,
        reasoning_trace: Optional[List[Any]] = None,
        trace_quality: str = "output_hash",
    ) -> AnalyzeResult:
        """Build the cognitive graph from the execution's reasoning trace."""
        trace = [
            {
                "step_index": step.step_index,
                "type": step.type,
                "content": step.content,
                **({"thought_signature": step.thought_signature} if step.thought_signature else {}),
            }
            for step in (reasoning_trace or [])
        ] if reasoning_trace and hasattr(reasoning_trace[0], "step_index") else (reasoning_trace or [])

        data = self._call(
            "analyze",
            {
                "executionId": execution_id,
                "analysisText": analysis_text,
                "reasoningTrace": trace,
                "traceQuality": trace_quality,
            },
        )
        return AnalyzeResult.from_dict(data)

    def sign(self, execution: ExecuteResult) -> SignResult:
        """Sign the execution payload with Ed25519."""
        now = datetime.now(timezone.utc).isoformat()
        data = self._call(
            "sign",
            {
                "executionId": execution.id,
                "rawOutput": execution.output,
                "modelProvider": execution.metadata.provider,
                "modelId": execution.metadata.model,
                "modelVersion": "latest",
                "modelParameters": {"temperature": 0.7},
                "executionMetrics": {
                    "latency_ms": execution.metadata.latency,
                    "tokens": execution.metadata.tokens.total,
                },
                "requesterInfo": {"source": "proofai-python"},
                "timestamps": {"request_received": now, "execution_completed": now},
            },
        )
        return SignResult.from_dict(data)

    def bundle(
        self,
        prompt_id: str,
        execution_id: str,
        analysis_id: str,
        signature_id: str,
        cognitive_hash: str,
        options: Optional[BundleOptions] = None,
        analysis_data: Optional["AnalyzeResult"] = None,
    ) -> BundleResult:
        """Assemble all artifacts into a tamper-evident evidence bundle."""
        body: Dict[str, Any] = {
            "promptId": prompt_id,
            "executionId": execution_id,
            "analysisId": analysis_id,
            "signatureId": signature_id,
            "cognitiveHash": cognitive_hash,
        }
        if options:
            if options.subject_id:
                body["subjectId"] = options.subject_id
            if options.session_id:
                body["sessionId"] = options.session_id
            if options.rag_sources:
                body["ragSources"] = options.rag_sources
        if analysis_data is not None:
            body["analysisData"] = {
                "id": analysis_data.id,
                "executionId": analysis_data.execution_id,
                "nodes": [
                    {
                        "id": n.id, "label": n.label, "type": n.type,
                        "weight": n.weight, "content": n.content,
                        "hash": n.hash, "traceSource": n.trace_source,
                    }
                    for n in analysis_data.nodes
                ],
                "edges": [
                    {"source": e.source, "target": e.target, "label": e.label, "weight": e.weight}
                    for e in analysis_data.edges
                ],
                "metrics": {
                    "nodeCount": analysis_data.metrics.node_count,
                    "edgeCount": analysis_data.metrics.edge_count,
                    "consistencyScore": analysis_data.metrics.consistency_score,
                    "complexityScore": analysis_data.metrics.complexity_score,
                },
                "cognitiveHash": analysis_data.cognitive_hash,
                "traceQuality": analysis_data.trace_quality,
                "traceSource": analysis_data.trace_source,
                **({"disclaimer": analysis_data.disclaimer} if analysis_data.disclaimer else {}),
                "timestamp": analysis_data.timestamp,
            }
        data = self._call("bundle", body)
        return BundleResult.from_dict(data)

    def anchor(
        self,
        bundle_id: str,
        network: Network = "polygon",
    ) -> AnchorResult:
        """Anchor the bundle hash to a public blockchain."""
        data = self._call("anchor", {"bundleId": bundle_id, "network": network})
        return AnchorResult.from_dict(data)

    def verify(self, bundle_id: str) -> VerifyResult:
        """Verify integrity and ledger anchoring of a bundle."""
        data = self._call("verify", {"bundleId": bundle_id})
        return VerifyResult.from_dict(data)

    # ------------------------------------------------------------------
    # AI Act compliance endpoints
    # ------------------------------------------------------------------

    def review(
        self,
        bundle_id: str,
        reviewer_id: str,
        role: str,
        decision: str,
        notes: Optional[str] = None,
    ) -> HumanReviewResult:
        """Record a human review decision on a bundle (EU AI Act Art. 14)."""
        data = self._call(
            "review",
            {
                "bundleId": bundle_id,
                "reviewerId": reviewer_id,
                "role": role,
                "decision": decision,
                "notes": notes,
            },
        )
        return HumanReviewResult.from_dict(data)

    def monitor(self) -> MonitoringStats:
        """Fetch monitoring statistics and anomaly alerts."""
        data = self._call("monitor", {})
        return MonitoringStats.from_dict(data)

    # ------------------------------------------------------------------
    # High-level one-shot pipeline
    # ------------------------------------------------------------------

    def certify(
        self,
        prompt: str,
        options: Optional[CertifyOptions] = None,
    ) -> Certificate:
        """
        Run the full certification pipeline in one call.

        Executes compress → execute → analyze → sign → bundle → anchor → verify
        and returns a :class:`Certificate` with the bundle ID, hash, blockchain
        explorer URL, and all intermediate step results.

        Args:
            prompt:  The prompt text to certify.
            options: Optional :class:`CertifyOptions` to control provider,
                     model, temperature, anchoring, etc.

        Returns:
            A :class:`Certificate` dataclass.

        Example::

            cert = client.certify(
                "Summarise the GDPR implications of this data sharing agreement",
                CertifyOptions(provider="anthropic"),
            )
            assert cert.verified
            print(cert.explorer_url)
        """
        opt = options or CertifyOptions()

        # 1. Compress
        compressed = self.compress(prompt, compression_level=opt.compression_level)

        # 2. Execute
        execution = self.execute(
            compressed.id,
            provider=opt.provider,
            model_id=opt.model_id,
            temperature=opt.temperature if opt.temperature is not None else 0.7,
            max_tokens=opt.max_tokens if opt.max_tokens is not None else 1024,
        )

        # 3. Analyze — forward the real reasoning trace and quality tier
        analysis = self.analyze(
            execution.id,
            execution.output,
            execution.reasoning_trace,
            execution.trace_quality,
        )

        # 4. Sign
        signature = self.sign(execution)

        # 5. Bundle — pass full analysis so nodes are persisted
        evidence_bundle = self.bundle(
            compressed.id,
            execution.id,
            analysis.id,
            signature.signature_id,
            analysis.cognitive_hash,
            analysis_data=analysis,
        )

        # 6. Anchor (best-effort)
        anchor_result: Optional[AnchorResult] = None
        if not opt.skip_anchor:
            try:
                anchor_result = self.anchor(evidence_bundle.id, opt.network)
            except ProofAIError:
                pass

        # 7. Verify
        verification = self.verify(evidence_bundle.id)

        return Certificate.from_dict(
            {
                "bundleId": evidence_bundle.id,
                "bundleHash": evidence_bundle.bundle_hash,
                "verified": verification.verified,
                "explorerUrl": anchor_result.explorer_url if anchor_result else None,
                "transactionHash": anchor_result.transaction_hash if anchor_result else None,
                "traceQuality": analysis.trace_quality or execution.trace_quality or "output_hash",
                "cognitiveNodes": analysis.metrics.node_count,
                **({"disclaimer": analysis.disclaimer} if analysis.disclaimer else {}),
                "steps": {
                    "compress": {
                        "id": compressed.id,
                        "originalPrompt": compressed.original_prompt,
                        "compressedDsl": compressed.compressed_dsl,
                        "metrics": {
                            "originalTokens": compressed.metrics.original_tokens,
                            "compressedTokens": compressed.metrics.compressed_tokens,
                            "compressionRatio": compressed.metrics.compression_ratio,
                            "semanticLoss": compressed.metrics.semantic_loss,
                        },
                        "timestamp": compressed.timestamp,
                    },
                    "execute": {
                        "id": execution.id,
                        "promptRef": execution.prompt_ref,
                        "output": execution.output,
                        "metadata": {
                            "provider": execution.metadata.provider,
                            "model": execution.metadata.model,
                            "latency": execution.metadata.latency,
                            "tokens": {
                                "prompt": execution.metadata.tokens.prompt,
                                "completion": execution.metadata.tokens.completion,
                                "total": execution.metadata.tokens.total,
                            },
                        },
                        "reasoning_trace": [
                            {
                                "step_index": s.step_index,
                                "type": s.type,
                                "content": s.content,
                                **({"thought_signature": s.thought_signature} if s.thought_signature else {}),
                            }
                            for s in execution.reasoning_trace
                        ],
                        "trace_quality": execution.trace_quality,
                        "timestamp": execution.timestamp,
                    },
                    "analyze": {
                        "id": analysis.id,
                        "executionId": analysis.execution_id,
                        "nodes": [
                            {
                                "id": n.id,
                                "label": n.label,
                                "content": n.content,
                                "hash": n.hash,
                                "type": n.type,
                                "weight": n.weight,
                                "thought_signature": n.thought_signature,
                                "traceSource": n.trace_source,
                            }
                            for n in analysis.nodes
                        ],
                        "edges": [
                            {
                                "source": e.source,
                                "target": e.target,
                                "label": e.label,
                                "weight": e.weight,
                            }
                            for e in analysis.edges
                        ],
                        "metrics": {
                            "nodeCount": analysis.metrics.node_count,
                            "edgeCount": analysis.metrics.edge_count,
                            "consistencyScore": analysis.metrics.consistency_score,
                            "complexityScore": analysis.metrics.complexity_score,
                        },
                        "cognitiveHash": analysis.cognitive_hash,
                        "traceQuality": analysis.trace_quality,
                        "traceSource": analysis.trace_source,
                        "disclaimer": analysis.disclaimer,
                        "timestamp": analysis.timestamp,
                    },
                    "sign": {
                        "signatureId": signature.signature_id,
                        "signedPayload": signature.signed_payload,
                        "signature": {
                            "algorithm": signature.signature.algorithm,
                            "signature": signature.signature.signature,
                            "signed_at": signature.signature.signed_at,
                            "signer_identity": signature.signature.signer_identity,
                            "includes_thought_signatures": signature.signature.includes_thought_signatures,
                        },
                        "timestampProof": {
                            "rfc3161_timestamp": signature.timestamp_proof.rfc3161_timestamp,
                            "verified": signature.timestamp_proof.verified,
                        } if signature.timestamp_proof else None,
                    },
                    "bundle": {
                        "id": evidence_bundle.id,
                        "promptId": evidence_bundle.prompt_id,
                        "executionId": evidence_bundle.execution_id,
                        "analysisId": evidence_bundle.analysis_id,
                        "signatureId": evidence_bundle.signature_id,
                        "cognitiveHash": evidence_bundle.cognitive_hash,
                        "bundleHash": evidence_bundle.bundle_hash,
                        "timeline": [
                            {"event": t.event, "timestamp": t.timestamp, "hash": t.hash}
                            for t in evidence_bundle.timeline
                        ],
                        "status": evidence_bundle.status,
                        "createdAt": evidence_bundle.created_at,
                    },
                    "anchor": {
                        "bundleId": anchor_result.bundle_id,
                        "transactionHash": anchor_result.transaction_hash,
                        "blockNumber": anchor_result.block_number,
                        "network": anchor_result.network,
                        "explorerUrl": anchor_result.explorer_url,
                        "status": anchor_result.status,
                        "timestamp": anchor_result.timestamp,
                    } if anchor_result else None,
                    "verify": {
                        "bundleId": verification.bundle_id,
                        "verified": verification.verified,
                        "checks": {
                            "integrityValid": verification.checks.integrity_valid,
                            "timestampValid": verification.checks.timestamp_valid,
                            "ledgerAnchored": verification.checks.ledger_anchored,
                            "hashMatches": verification.checks.hash_matches,
                        },
                        "ledgerInfo": {
                            "transactionHash": verification.ledger_info.transaction_hash,
                            "blockNumber": verification.ledger_info.block_number,
                            "network": verification.ledger_info.network,
                            "confirmedAt": verification.ledger_info.confirmed_at,
                        } if verification.ledger_info else None,
                        "timestamp": verification.timestamp,
                    },
                },
            }
        )
