export interface ProofAIConfig {
  apiKey: string;
  baseUrl?: string;
}

export type Provider = 'anthropic' | 'openai' | 'gemini' | 'google';
export type CompressionLevel = 'low' | 'medium' | 'high';
export type Network = 'polygon' | 'ethereum';

export interface CompressOptions {
  compressionLevel?: CompressionLevel;
  preserveContext?: boolean;
  targetModels?: string[];
}

export interface CompressResult {
  id: string;
  originalPrompt: string;
  compressedDsl: string;
  metrics: {
    originalTokens: number;
    compressedTokens: number;
    compressionRatio: number;
    semanticLoss: number;
  };
  timestamp: string;
}

export interface ExecuteOptions {
  provider: Provider;
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
}

export interface ExecuteResult {
  id: string;
  promptRef: string;
  output: string;
  metadata: {
    provider: string;
    model: string;
    latency: number;
    tokens: { prompt: number; completion: number; total: number };
  };
  reasoning_trace?: Array<{
    step_index: number;
    type: string;
    content: string;
    thought_signature?: string;
  }>;
  trace_quality?: 'native' | 'inferred_via_gemini' | 'output_hash';
  timestamp: string;
}

export type TraceQuality = 'native' | 'inferred_via_gemini' | 'output_hash';
export type TraceSource = 'native_thinking' | 'inferred_via_gemini' | 'output_hash' | 'synthetic';

export interface CognitiveNode {
  id: string;
  /** First sentence of the reasoning step (max 60 chars) — used as graph label */
  label: string;
  /** Full content of the reasoning step */
  content?: string;
  /** SHA-256 of the node content (thought_signature from Gemini or recomputed) */
  hash?: string;
  type: 'reasoning' | 'concept' | 'entity' | 'action' | 'relation';
  weight: number;
  /** Present on native Gemini thinking blocks */
  thought_signature?: string;
  /** Where this node originated */
  traceSource?: TraceSource;
}

export interface AnalyzeResult {
  id: string;
  executionId: string;
  nodes: CognitiveNode[];
  edges: Array<{ source: string; target: string; label: string; weight: number }>;
  metrics: {
    nodeCount: number;
    edgeCount: number;
    consistencyScore: number;
    complexityScore: number;
  };
  cognitiveHash: string;
  traceQuality: TraceQuality;
  traceSource: TraceSource;
  /** Present when traceQuality is "inferred_via_gemini" */
  disclaimer?: string;
  timestamp: string;
}

export interface SignResult {
  signatureId: string;
  signedPayload: Record<string, unknown>;
  signature: {
    algorithm: string;
    signature: string;
    signed_at: string;
    signer_identity: string;
    includes_thought_signatures: boolean;
  };
  timestampProof: { rfc3161_timestamp: string; verified: boolean } | null;
  cognitive_trace?: Record<string, unknown>;
}

export interface BundleResult {
  id: string;
  promptId: string;
  executionId: string;
  analysisId: string;
  signatureId: string;
  cognitiveHash: string;
  bundleHash: string;
  timeline: Array<{ event: string; timestamp: string; hash: string }>;
  status: 'pending' | 'created' | 'anchored' | 'verified';
  createdAt: string;
}

export interface AnchorResult {
  bundleId: string;
  transactionHash: string;
  blockNumber: number;
  network: string;
  explorerUrl: string;
  status: 'pending' | 'confirmed' | 'failed';
  timestamp: string;
}

export interface VerifyResult {
  bundleId: string;
  verified: boolean;
  checks: {
    integrityValid: boolean;
    timestampValid: boolean;
    ledgerAnchored: boolean;
    hashMatches: boolean;
  };
  ledgerInfo?: {
    transactionHash: string;
    blockNumber: number;
    network: string;
    confirmedAt: string;
  };
  timestamp: string;
}

export interface BundleOptions {
  subjectId?: string;
  sessionId?: string;
  ragSources?: Array<{
    document_id: string;
    document_name: string;
    chunk_index: number;
    relevance_score: number;
  }>;
}

export interface HumanReviewResult {
  id: string;
  bundleId: string;
  reviewerIdHash: string;
  role: string;
  decision: 'approved' | 'rejected' | 'flagged';
  notes: string | null;
  reviewedAt: string;
}

export interface MonitoringStats {
  period: string;
  generatedAt: string;
  totalExecutions: number;
  anomalyCount: number;
  anomalies: Array<{ type: string; description: string; severity: string }>;
  statusBreakdown: Record<string, number>;
  humanReviews: { total: number; approved: number; rejected: number; flagged: number };
  riskDistribution: { low: number; medium: number; high: number };
  gdpr: { anonymizedBundles: number };
  compliance: {
    retentionPolicy: string;
    loggingEnabled: boolean;
    humanOversightActive: boolean;
    blockchainAnchoringActive: boolean;
  };
}

export interface CertifyOptions {
  provider?: Provider;
  modelId?: string;
  temperature?: number;
  maxTokens?: number;
  compressionLevel?: CompressionLevel;
  network?: Network;
  skipAnchor?: boolean;
}

export interface Certificate {
  bundleId: string;
  bundleHash: string;
  verified: boolean;
  explorerUrl?: string;
  transactionHash?: string;
  /** Quality of the cognitive trace captured */
  traceQuality: TraceQuality;
  /** Number of reasoning steps captured */
  cognitiveNodes: number;
  /** Present when traceQuality is "inferred_via_gemini" */
  disclaimer?: string;
  steps: {
    compress: CompressResult;
    execute: ExecuteResult;
    analyze: AnalyzeResult;
    sign: SignResult;
    bundle: BundleResult;
    anchor?: AnchorResult;
    verify: VerifyResult;
  };
}
