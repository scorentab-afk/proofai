"""
proofai — AI Cognitive Evidence Platform.

Cryptographic proof that AI thought before it answered.
EU AI Act compliance with blockchain anchoring on Polygon.

Quick start::

    from proofai import ProofAI, CertifyOptions

    client = ProofAI(api_key="pk_live_...")
    cert = client.certify(
        "Analyse the legal risks of this SaaS contract",
        CertifyOptions(provider="anthropic"),
    )

    print(cert.verified)         # True
    print(cert.bundle_id)        # bnd_8019b37a7f44_...
    print(cert.explorer_url)     # https://polygonscan.com/tx/0x...
    print(cert.trace_quality)    # "inferred_via_gemini"
    print(cert.cognitive_nodes)  # 7

Convenience functions use a client built from environment variables
(``PROOFAI_ANON_KEY`` and optionally ``PROOFAI_API_URL``)::

    from proofai import certify, verify, log

    cert   = certify("Your prompt here")
    result = verify("bnd_...")
    bundle = log("High-risk decision", {"subject": "user_123"})
"""

from __future__ import annotations

from typing import Any, Dict, Optional

from .client import ProofAI, ProofAIError
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
    SignResult,
    VerifyResult,
)

__all__ = [
    # Client
    "ProofAI",
    "ProofAIError",
    # Convenience functions
    "certify",
    "verify",
    "log",
    # Types
    "Certificate",
    "CertifyOptions",
    "BundleOptions",
    "VerifyResult",
    "BundleResult",
    "CompressResult",
    "ExecuteResult",
    "AnalyzeResult",
    "SignResult",
    "AnchorResult",
    "HumanReviewResult",
    "MonitoringStats",
]

__version__ = "1.0.0"


def _default_client() -> ProofAI:
    """Return a client built from environment variables."""
    return ProofAI()


def certify(
    prompt: str,
    options: Optional[CertifyOptions] = None,
) -> Certificate:
    """
    Certify a prompt using a client built from environment variables.

    Requires ``PROOFAI_ANON_KEY`` to be set.

    Args:
        prompt:  The prompt text to certify.
        options: Optional :class:`CertifyOptions`.

    Returns:
        :class:`Certificate`
    """
    with _default_client() as client:
        return client.certify(prompt, options)


def verify(bundle_id: str) -> VerifyResult:
    """
    Verify a bundle by ID using a client built from environment variables.

    Requires ``PROOFAI_ANON_KEY`` to be set.

    Args:
        bundle_id: The bundle ID to verify.

    Returns:
        :class:`VerifyResult`
    """
    with _default_client() as client:
        return client.verify(bundle_id)


def log(
    decision: str,
    metadata: Optional[Dict[str, Any]] = None,
) -> BundleResult:
    """
    Log a high-risk AI decision as a minimal evidence bundle.

    Runs compress → execute → analyze → sign → bundle without anchoring.
    Suitable for audit logging where on-chain anchoring is optional.

    Requires ``PROOFAI_ANON_KEY`` to be set.

    Args:
        decision: A description of the AI decision being logged.
        metadata: Optional metadata dict (stored in the bundle session context).

    Returns:
        :class:`BundleResult`
    """
    session_id = None
    subject_id = None
    if metadata:
        session_id = str(metadata.get("session_id", "")) or None
        subject_id = str(metadata.get("subject", metadata.get("subject_id", ""))) or None

    with _default_client() as client:
        compressed = client.compress(decision)
        execution = client.execute(compressed.id)
        analysis = client.analyze(
            execution.id,
            execution.output,
            execution.reasoning_trace,
            execution.trace_quality,
        )
        signature = client.sign(execution)
        return client.bundle(
            compressed.id,
            execution.id,
            analysis.id,
            signature.signature_id,
            analysis.cognitive_hash,
            BundleOptions(subject_id=subject_id, session_id=session_id),
        )
