"""ProofAI type definitions — mirrors the TypeScript SDK types."""

from __future__ import annotations

from dataclasses import dataclass, field
from typing import Any, Dict, List, Literal, Optional

Provider = Literal["anthropic", "openai", "gemini", "google"]
CompressionLevel = Literal["low", "medium", "high"]
Network = Literal["polygon", "ethereum"]
TraceQuality = Literal["native", "inferred_via_gemini", "output_hash"]
TraceSource = Literal["native_thinking", "inferred_via_gemini", "output_hash", "synthetic"]


@dataclass
class CompressMetrics:
    original_tokens: int
    compressed_tokens: int
    compression_ratio: float
    semantic_loss: float


@dataclass
class CompressResult:
    id: str
    original_prompt: str
    compressed_dsl: str
    metrics: CompressMetrics
    timestamp: str

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "CompressResult":
        m = d["metrics"]
        return cls(
            id=d["id"],
            original_prompt=d["originalPrompt"],
            compressed_dsl=d["compressedDsl"],
            metrics=CompressMetrics(
                original_tokens=m["originalTokens"],
                compressed_tokens=m["compressedTokens"],
                compression_ratio=m["compressionRatio"],
                semantic_loss=m["semanticLoss"],
            ),
            timestamp=d["timestamp"],
        )


@dataclass
class ExecutionTokens:
    prompt: int
    completion: int
    total: int


@dataclass
class ExecutionMetadata:
    provider: str
    model: str
    latency: float
    tokens: ExecutionTokens


@dataclass
class ReasoningStep:
    step_index: int
    type: str
    content: str
    thought_signature: Optional[str] = None


@dataclass
class ExecuteResult:
    id: str
    prompt_ref: str
    output: str
    metadata: ExecutionMetadata
    timestamp: str
    reasoning_trace: List[ReasoningStep] = field(default_factory=list)
    trace_quality: TraceQuality = "output_hash"

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "ExecuteResult":
        meta = d["metadata"]
        tok = meta["tokens"]
        trace = [
            ReasoningStep(
                step_index=s["step_index"],
                type=s["type"],
                content=s["content"],
                thought_signature=s.get("thought_signature"),
            )
            for s in d.get("reasoning_trace", [])
        ]
        return cls(
            id=d["id"],
            prompt_ref=d["promptRef"],
            output=d["output"],
            metadata=ExecutionMetadata(
                provider=meta["provider"],
                model=meta["model"],
                latency=meta["latency"],
                tokens=ExecutionTokens(
                    prompt=tok["prompt"],
                    completion=tok["completion"],
                    total=tok["total"],
                ),
            ),
            timestamp=d["timestamp"],
            reasoning_trace=trace,
            trace_quality=d.get("trace_quality", "output_hash"),
        )


@dataclass
class CognitiveNode:
    id: str
    label: str
    type: str
    weight: float
    content: Optional[str] = None
    hash: Optional[str] = None
    thought_signature: Optional[str] = None
    trace_source: Optional[TraceSource] = None


@dataclass
class CognitiveEdge:
    source: str
    target: str
    label: str
    weight: float


@dataclass
class AnalysisMetrics:
    node_count: int
    edge_count: int
    consistency_score: float
    complexity_score: float


@dataclass
class AnalyzeResult:
    id: str
    execution_id: str
    nodes: List[CognitiveNode]
    edges: List[CognitiveEdge]
    metrics: AnalysisMetrics
    cognitive_hash: str
    trace_quality: TraceQuality
    trace_source: TraceSource
    timestamp: str
    disclaimer: Optional[str] = None

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "AnalyzeResult":
        nodes = [
            CognitiveNode(
                id=n["id"],
                label=n["label"],
                type=n["type"],
                weight=n["weight"],
                content=n.get("content"),
                hash=n.get("hash"),
                thought_signature=n.get("thought_signature"),
                trace_source=n.get("traceSource"),
            )
            for n in d.get("nodes", [])
        ]
        edges = [
            CognitiveEdge(
                source=e["source"],
                target=e["target"],
                label=e["label"],
                weight=e["weight"],
            )
            for e in d.get("edges", [])
        ]
        m = d["metrics"]
        return cls(
            id=d["id"],
            execution_id=d["executionId"],
            nodes=nodes,
            edges=edges,
            metrics=AnalysisMetrics(
                node_count=m["nodeCount"],
                edge_count=m["edgeCount"],
                consistency_score=m["consistencyScore"],
                complexity_score=m["complexityScore"],
            ),
            cognitive_hash=d["cognitiveHash"],
            trace_quality=d.get("traceQuality", "output_hash"),
            trace_source=d.get("traceSource", "output_hash"),
            timestamp=d["timestamp"],
            disclaimer=d.get("disclaimer"),
        )


@dataclass
class SignatureInfo:
    algorithm: str
    signature: str
    signed_at: str
    signer_identity: str
    includes_thought_signatures: bool


@dataclass
class TimestampProof:
    rfc3161_timestamp: str
    verified: bool


@dataclass
class SignResult:
    signature_id: str
    signed_payload: Dict[str, Any]
    signature: SignatureInfo
    timestamp_proof: Optional[TimestampProof]
    cognitive_trace: Optional[Dict[str, Any]] = None

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "SignResult":
        sig = d["signature"]
        tp = d.get("timestampProof")
        return cls(
            signature_id=d["signatureId"],
            signed_payload=d["signedPayload"],
            signature=SignatureInfo(
                algorithm=sig["algorithm"],
                signature=sig["signature"],
                signed_at=sig["signed_at"],
                signer_identity=sig["signer_identity"],
                includes_thought_signatures=sig["includes_thought_signatures"],
            ),
            timestamp_proof=TimestampProof(
                rfc3161_timestamp=tp["rfc3161_timestamp"],
                verified=tp["verified"],
            ) if tp else None,
            cognitive_trace=d.get("cognitive_trace"),
        )


@dataclass
class TimelineEvent:
    event: str
    timestamp: str
    hash: str


@dataclass
class BundleResult:
    id: str
    prompt_id: str
    execution_id: str
    analysis_id: str
    signature_id: str
    cognitive_hash: str
    bundle_hash: str
    timeline: List[TimelineEvent]
    status: str
    created_at: str

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "BundleResult":
        return cls(
            id=d["id"],
            prompt_id=d["promptId"],
            execution_id=d["executionId"],
            analysis_id=d["analysisId"],
            signature_id=d["signatureId"],
            cognitive_hash=d["cognitiveHash"],
            bundle_hash=d["bundleHash"],
            timeline=[
                TimelineEvent(event=t["event"], timestamp=t["timestamp"], hash=t["hash"])
                for t in d.get("timeline", [])
            ],
            status=d["status"],
            created_at=d["createdAt"],
        )


@dataclass
class AnchorResult:
    bundle_id: str
    transaction_hash: str
    block_number: int
    network: str
    explorer_url: str
    status: str
    timestamp: str

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "AnchorResult":
        return cls(
            bundle_id=d["bundleId"],
            transaction_hash=d["transactionHash"],
            block_number=d["blockNumber"],
            network=d["network"],
            explorer_url=d["explorerUrl"],
            status=d["status"],
            timestamp=d["timestamp"],
        )


@dataclass
class VerifyChecks:
    integrity_valid: bool
    timestamp_valid: bool
    ledger_anchored: bool
    hash_matches: bool


@dataclass
class LedgerInfo:
    transaction_hash: str
    block_number: int
    network: str
    confirmed_at: str


@dataclass
class VerifyResult:
    bundle_id: str
    verified: bool
    checks: VerifyChecks
    timestamp: str
    ledger_info: Optional[LedgerInfo] = None

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "VerifyResult":
        c = d["checks"]
        li = d.get("ledgerInfo")
        return cls(
            bundle_id=d["bundleId"],
            verified=d["verified"],
            checks=VerifyChecks(
                integrity_valid=c["integrityValid"],
                timestamp_valid=c["timestampValid"],
                ledger_anchored=c["ledgerAnchored"],
                hash_matches=c["hashMatches"],
            ),
            timestamp=d["timestamp"],
            ledger_info=LedgerInfo(
                transaction_hash=li["transactionHash"],
                block_number=li["blockNumber"],
                network=li["network"],
                confirmed_at=li["confirmedAt"],
            ) if li else None,
        )


@dataclass
class CertificateSteps:
    compress: CompressResult
    execute: ExecuteResult
    analyze: AnalyzeResult
    sign: SignResult
    bundle: BundleResult
    verify: VerifyResult
    anchor: Optional[AnchorResult] = None


@dataclass
class Certificate:
    bundle_id: str
    bundle_hash: str
    verified: bool
    trace_quality: TraceQuality
    cognitive_nodes: int
    steps: CertificateSteps
    explorer_url: Optional[str] = None
    transaction_hash: Optional[str] = None
    disclaimer: Optional[str] = None

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "Certificate":
        s = d["steps"]
        anchor = AnchorResult.from_dict(s["anchor"]) if s.get("anchor") else None
        return cls(
            bundle_id=d["bundleId"],
            bundle_hash=d["bundleHash"],
            verified=d["verified"],
            trace_quality=d.get("traceQuality", "output_hash"),
            cognitive_nodes=d.get("cognitiveNodes", 0),
            explorer_url=d.get("explorerUrl"),
            transaction_hash=d.get("transactionHash"),
            disclaimer=d.get("disclaimer"),
            steps=CertificateSteps(
                compress=CompressResult.from_dict(s["compress"]),
                execute=ExecuteResult.from_dict(s["execute"]),
                analyze=AnalyzeResult.from_dict(s["analyze"]),
                sign=SignResult.from_dict(s["sign"]),
                bundle=BundleResult.from_dict(s["bundle"]),
                verify=VerifyResult.from_dict(s["verify"]),
                anchor=anchor,
            ),
        )


@dataclass
class HumanReviewResult:
    id: str
    bundle_id: str
    reviewer_id_hash: str
    role: str
    decision: str
    reviewed_at: str
    notes: Optional[str] = None

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "HumanReviewResult":
        return cls(
            id=d["id"],
            bundle_id=d["bundleId"],
            reviewer_id_hash=d["reviewerIdHash"],
            role=d["role"],
            decision=d["decision"],
            reviewed_at=d["reviewedAt"],
            notes=d.get("notes"),
        )


@dataclass
class MonitoringStats:
    period: str
    generated_at: str
    total_executions: int
    anomaly_count: int
    anomalies: List[Dict[str, Any]]
    status_breakdown: Dict[str, int]
    human_reviews: Dict[str, int]
    risk_distribution: Dict[str, int]
    gdpr: Dict[str, Any]
    compliance: Dict[str, Any]

    @classmethod
    def from_dict(cls, d: Dict[str, Any]) -> "MonitoringStats":
        return cls(
            period=d["period"],
            generated_at=d["generatedAt"],
            total_executions=d["totalExecutions"],
            anomaly_count=d["anomalyCount"],
            anomalies=d.get("anomalies", []),
            status_breakdown=d.get("statusBreakdown", {}),
            human_reviews=d.get("humanReviews", {}),
            risk_distribution=d.get("riskDistribution", {}),
            gdpr=d.get("gdpr", {}),
            compliance=d.get("compliance", {}),
        )


@dataclass
class BundleOptions:
    subject_id: Optional[str] = None
    session_id: Optional[str] = None
    rag_sources: Optional[List[Dict[str, Any]]] = None


@dataclass
class CertifyOptions:
    provider: Provider = "anthropic"
    model_id: Optional[str] = None
    temperature: Optional[float] = None
    max_tokens: Optional[int] = None
    compression_level: CompressionLevel = "medium"
    network: Network = "polygon"
    skip_anchor: bool = False
