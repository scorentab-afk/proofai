import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { readPipelineParams, isAutoRun, navigatePipeline } from '@/lib/pipeline-params';
import { MainLayout } from '@/components/layout/MainLayout';
import { 
  FileSignature, 
  Shield, 
  Clock, 
  CheckCircle2, 
  Copy, 
  AlertCircle,
  Cpu,
  Hash,
  User,
  Settings,
  Link2,
  ExternalLink,
  Loader2,
  Brain,
  Workflow,
  Code2,
  ShieldCheck,
  ShieldAlert,
  Zap,
  FileDown
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { api, SignatureResponse, BlockchainAnchorResult } from '@/api/client';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { CodeBlock } from '@/components/shared/CodeBlock';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { ThoughtSignatureExtractor } from '@/lib/thought-signature';
import { GeminiThoughtTrace } from '@/components/shared/GeminiThoughtTrace';
import { ReasoningTrace, ReasoningStep } from '@/components/shared/ReasoningTrace';
import { verifySignatureResponse, type VerificationResult as Ed25519VerificationResult } from '@/lib/ed25519-verify';
import { exportCognitiveTracePDF } from '@/lib/pdf-export';

// Mock data for demo
const MOCK_DATA = {
  executionId: 'exec_gemini_2025_demo_001',
  rawOutput: `Based on my analysis, here's the flight status information:

**Flight UA 1234 Status:**
- Current Status: Delayed by 45 minutes
- Original Departure: 14:30 PST
- New Estimated Departure: 15:15 PST
- Gate: B42
- Reason: Weather conditions at destination

I've also checked for alternative flights and found:
1. UA 1256 departing at 16:00 - On Time
2. UA 1298 departing at 17:30 - On Time

Would you like me to help you rebook on one of these alternatives?`,
  modelProvider: 'google',
  modelId: 'gemini-pro',
  modelVersion: '2025-01-15',
  temperature: '0.4',
  maxTokens: '4096',
  requesterName: 'Demo User',
  requesterOrg: 'proofAI Labs',
};

const AISignature = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const autoRunTriggered = useRef(false);

  const pipelineData = readPipelineParams(searchParams);
  const autoRun = isAutoRun(searchParams);

  const [isLoading, setIsLoading] = useState(false);
  const [signatureResult, setSignatureResult] = useState<SignatureResponse | null>(null);

  // Form state
  const [executionId, setExecutionId] = useState('');
  const [rawOutput, setRawOutput] = useState('');
  const [modelProvider, setModelProvider] = useState('openai');
  const [modelId, setModelId] = useState('gpt-4');
  const [modelVersion, setModelVersion] = useState('');
  const [temperature, setTemperature] = useState('0.7');
  const [maxTokens, setMaxTokens] = useState('2048');
  const [requesterName, setRequesterName] = useState('');
  const [requesterOrg, setRequesterOrg] = useState('');

  // Auto-fill from pipeline
  useEffect(() => {
    if (pipelineData.executionId && !executionId) setExecutionId(pipelineData.executionId);
    const stateOutput = (location.state as Record<string, unknown>)?.rawOutput as string;
    if (stateOutput && !rawOutput) setRawOutput(stateOutput);
  }, [pipelineData.executionId, location.state]);

  // Auto-run
  useEffect(() => {
    if (autoRun && pipelineData.executionId && !autoRunTriggered.current && !isLoading && !signatureResult) {
      autoRunTriggered.current = true;
      setTimeout(() => handleAutoSign(), 300);
    }
  }, [autoRun, pipelineData.executionId]);

  const handleAutoSign = async () => {
    const execId = pipelineData.executionId || executionId;
    const output = (location.state as Record<string, unknown>)?.rawOutput as string || rawOutput || 'auto-signed output';
    setExecutionId(execId);
    setRawOutput(output);

    setIsLoading(true);
    try {
      const now = new Date().toISOString();
      const result = await api.signAIResponse({
        executionId: execId,
        rawOutput: output,
        modelProvider: modelProvider || 'openai',
        modelId: modelId || 'gpt-4',
        modelVersion: modelVersion || 'latest',
        modelParameters: { temperature: 0.7, max_tokens: 2048 },
        executionMetrics: { latency_ms: 300, tokens_used: 500 },
        requesterInfo: { name: 'ProofAI Pipeline', organization: 'Auto' },
        timestamps: { request_received: now, execution_started: now, execution_completed: now },
      });
      setSignatureResult(result);
      toast.success('AI response signed successfully!');
      navigatePipeline(
        navigate,
        '/bundle',
        { ...pipelineData, signatureId: result.signatureId },
        { originalPrompt: (location.state as Record<string, unknown>)?.originalPrompt, aiResponse: (location.state as Record<string, unknown>)?.aiResponse },
      );
    } catch (error) {
      toast.error('Failed to sign AI response');
    } finally {
      setIsLoading(false);
    }
  };

  const loadMockData = () => {
    setExecutionId(MOCK_DATA.executionId);
    setRawOutput(MOCK_DATA.rawOutput);
    setModelProvider(MOCK_DATA.modelProvider);
    setModelId(MOCK_DATA.modelId);
    setModelVersion(MOCK_DATA.modelVersion);
    setTemperature(MOCK_DATA.temperature);
    setMaxTokens(MOCK_DATA.maxTokens);
    setRequesterName(MOCK_DATA.requesterName);
    setRequesterOrg(MOCK_DATA.requesterOrg);
    toast.success('Demo data loaded - Provider set to Google/Gemini');
  };

  // Verification state
  const [verifySignatureId, setVerifySignatureId] = useState('');
  const [verifyResult, setVerifyResult] = useState<Ed25519VerificationResult | null>(null);
  const [verifyPayloadJson, setVerifyPayloadJson] = useState('');
  const [isVerifying, setIsVerifying] = useState(false);

  // Blockchain anchor state
  const [selectedNetwork, setSelectedNetwork] = useState<'polygon' | 'ethereum'>('polygon');
  const [isAnchoring, setIsAnchoring] = useState(false);
  const [anchorResult, setAnchorResult] = useState<BlockchainAnchorResult | null>(null);

  // Chain validation state
  const [chainValidation, setChainValidation] = useState<{ valid: boolean; errors: string[] } | null>(null);
  
  // Trace view toggle: 'detailed' = GeminiThoughtTrace, 'unified' = ReasoningTrace
  const [traceView, setTraceView] = useState<'detailed' | 'unified'>('detailed');
  const [chainHash, setChainHash] = useState<string | null>(null);

  // Validate chain when signature result changes
  useEffect(() => {
    if (signatureResult?.cognitive_trace?.thought_signatures) {
      const validation = ThoughtSignatureExtractor.validateSignatureChain(
        signatureResult.cognitive_trace.thought_signatures
      );
      setChainValidation(validation);

      // Calculate chain hash
      ThoughtSignatureExtractor.hashChain(signatureResult.cognitive_trace.thought_signatures)
        .then(hash => setChainHash(hash))
        .catch(() => setChainHash(null));
    } else {
      setChainValidation(null);
      setChainHash(null);
    }
  }, [signatureResult]);

  const handleSign = async () => {
    if (!executionId.trim() || !rawOutput.trim()) {
      toast.error('Please fill in required fields');
      return;
    }

    setIsLoading(true);
    try {
      const now = new Date().toISOString();
      const result = await api.signAIResponse({
        executionId,
        rawOutput,
        modelProvider,
        modelId,
        modelVersion,
        modelParameters: {
          temperature: parseFloat(temperature),
          max_tokens: parseInt(maxTokens),
        },
        executionMetrics: {
          latency_ms: Math.floor(Math.random() * 500) + 200,
          tokens_used: Math.floor(Math.random() * 1000) + 500,
        },
        requesterInfo: {
          name: requesterName || 'Anonymous',
          organization: requesterOrg || 'Unknown',
        },
        timestamps: {
          request_received: now,
          execution_started: now,
          execution_completed: now,
        },
      });
      
      setSignatureResult(result);
      toast.success('AI response signed successfully!');
      // Auto-navigate if in pipeline
      if (pipelineData.executionId) {
        navigatePipeline(
          navigate,
          '/bundle',
          { ...pipelineData, signatureId: result.signatureId },
          { originalPrompt: (location.state as Record<string, unknown>)?.originalPrompt, aiResponse: (location.state as Record<string, unknown>)?.aiResponse },
        );
      }
    } catch (error) {
      toast.error('Failed to sign AI response');
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerify = async () => {
    setIsVerifying(true);
    try {
      let dataToVerify: {
        signatureId: string;
        signedPayload: Record<string, unknown>;
        signature: {
          algorithm: string;
          signature: string;
          signed_at: string;
          signer_identity: string;
          includes_thought_signatures: boolean;
        };
        cognitive_trace?: {
          thought_signatures: Array<{
            signature: string;
            step_index: number;
            step_type: string;
            associated_function?: string;
          }>;
          reasoning_steps: number;
          function_calls: number;
        };
      };

      // If JSON payload provided, parse it
      if (verifyPayloadJson.trim()) {
        try {
          const parsed = JSON.parse(verifyPayloadJson);
          dataToVerify = {
            signatureId: parsed.signature_id || parsed.signatureId || verifySignatureId,
            signedPayload: parsed.signed_payload || parsed.signedPayload || {},
            signature: parsed.signature || {},
            cognitive_trace: parsed.cognitive_trace || parsed.signed_payload?.cognitive_trace,
          };
        } catch {
          toast.error('Invalid JSON payload');
          setIsVerifying(false);
          return;
        }
      } else if (signatureResult) {
        // Use last signature result
        dataToVerify = {
          signatureId: signatureResult.signatureId,
          signedPayload: signatureResult.signedPayload,
          signature: signatureResult.signature,
          cognitive_trace: signatureResult.cognitive_trace,
        };
      } else {
        toast.error('Please provide a signature payload to verify');
        setIsVerifying(false);
        return;
      }

      // Perform Ed25519 verification
      const result = await verifySignatureResponse(dataToVerify);
      setVerifyResult(result);
      
      if (result.valid) {
        toast.success('Ed25519 signature verified successfully!');
      } else {
        toast.error(`Verification failed: ${result.errors?.[0] || 'Unknown error'}`);
      }
    } catch (error) {
      toast.error('Verification error');
    } finally {
      setIsVerifying(false);
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard`);
  };

  const handleAnchor = async () => {
    if (!signatureResult) {
      toast.error('Please sign a response first');
      return;
    }

    setIsAnchoring(true);
    try {
      const result = await api.anchorToBlockchain(signatureResult.signatureId, selectedNetwork);
      setAnchorResult(result);
      toast.success(`Signature anchored to ${selectedNetwork} blockchain!`);
    } catch (error) {
      toast.error('Failed to anchor signature to blockchain');
    } finally {
      setIsAnchoring(false);
    }
  };

  return (
    <MainLayout title="AI Response Signature" subtitle="Sign AI responses with cryptographic proof and complete metadata">
      <Tabs defaultValue="sign" className="space-y-6">
        <TabsList className="grid w-full max-w-lg grid-cols-3">
          <TabsTrigger value="sign">Sign Response</TabsTrigger>
          <TabsTrigger value="anchor" disabled={!signatureResult}>Anchor On-Chain</TabsTrigger>
          <TabsTrigger value="verify">Verify Signature</TabsTrigger>
        </TabsList>

        <TabsContent value="sign" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Input Form */}
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <FileSignature className="w-5 h-5 text-primary" />
                  Signature Request
                </CardTitle>
                <CardDescription>
                  Provide execution details and AI output to sign
                </CardDescription>
              </CardHeader>
              <div className="px-6 pb-2">
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={loadMockData}
                  className="w-full border-dashed border-primary/50 text-primary hover:bg-primary/10"
                >
                  <Zap className="w-4 h-4 mr-2" />
                  Load Gemini demo data
                </Button>
              </div>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="executionId">Execution ID *</Label>
                  <Input
                    id="executionId"
                    placeholder="exec_abc123..."
                    value={executionId}
                    onChange={(e) => setExecutionId(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="rawOutput">Raw AI Output *</Label>
                  <Textarea
                    id="rawOutput"
                    placeholder="Paste the AI model's raw output here..."
                    className="min-h-[120px] font-mono text-sm"
                    value={rawOutput}
                    onChange={(e) => setRawOutput(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Model Provider</Label>
                    <Select value={modelProvider} onValueChange={setModelProvider}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openai">OpenAI</SelectItem>
                        <SelectItem value="anthropic">Anthropic</SelectItem>
                        <SelectItem value="google">Google</SelectItem>
                        <SelectItem value="meta">Meta</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Model ID</Label>
                    <Select value={modelId} onValueChange={setModelId}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="gpt-4">GPT-4</SelectItem>
                        <SelectItem value="gpt-4-turbo">GPT-4 Turbo</SelectItem>
                        <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                        <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                        <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="modelVersion">Model Version</Label>
                  <Input
                    id="modelVersion"
                    placeholder="e.g. 2025-04"
                    value={modelVersion}
                    onChange={(e) => setModelVersion(e.target.value)}
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="temperature">Temperature</Label>
                    <Input
                      id="temperature"
                      type="number"
                      step="0.1"
                      min="0"
                      max="2"
                      value={temperature}
                      onChange={(e) => setTemperature(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="maxTokens">Max Tokens</Label>
                    <Input
                      id="maxTokens"
                      type="number"
                      value={maxTokens}
                      onChange={(e) => setMaxTokens(e.target.value)}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="requesterName">Requester Name</Label>
                    <Input
                      id="requesterName"
                      placeholder="John Doe"
                      value={requesterName}
                      onChange={(e) => setRequesterName(e.target.value)}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="requesterOrg">Organization</Label>
                    <Input
                      id="requesterOrg"
                      placeholder="Acme Corp"
                      value={requesterOrg}
                      onChange={(e) => setRequesterOrg(e.target.value)}
                    />
                  </div>
                </div>

                <Button 
                  onClick={handleSign} 
                  disabled={isLoading}
                  className="w-full"
                >
                  {isLoading ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Signing...
                    </>
                  ) : (
                    <>
                      <FileSignature className="w-4 h-4 mr-2" />
                      Sign AI Response
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            {/* Results */}
            <AnimatePresence mode="wait">
              {signatureResult ? (
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  className="space-y-4"
                >
                  <Card className="glass-card border-primary/30">
                    <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-primary" />
                        Signature Created
                        <StatusBadge status="success">Signed</StatusBadge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="flex items-center justify-between p-3 bg-muted/50 rounded-lg">
                        <div>
                          <p className="text-sm text-muted-foreground">Signature ID</p>
                          <p className="font-mono font-medium">{signatureResult.signatureId}</p>
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => copyToClipboard(signatureResult.signatureId, 'Signature ID')}
                        >
                          <Copy className="w-4 h-4" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                            <Settings className="w-4 h-4" />
                            Algorithm
                          </div>
                          <p className="font-medium">{signatureResult.signature.algorithm}</p>
                        </div>
                        <div className="p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                            <User className="w-4 h-4" />
                            Signer
                          </div>
                          <p className="font-medium text-sm">{signatureResult.signature.signer_identity}</p>
                        </div>
                      </div>

                      <div className="p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-2 text-muted-foreground text-sm mb-1">
                          <Clock className="w-4 h-4" />
                          Signed At
                        </div>
                        <p className="font-medium">
                          {new Date(signatureResult.signature.signed_at).toLocaleString()}
                        </p>
                      </div>

                      {signatureResult.timestampProof && (
                        <div className="flex items-center gap-2 p-3 bg-green-500/10 border border-green-500/30 rounded-lg">
                          <CheckCircle2 className="w-5 h-5 text-green-500" />
                          <div>
                            <p className="font-medium text-green-600">RFC 3161 Timestamp Verified</p>
                            <p className="text-sm text-muted-foreground">
                              {signatureResult.timestampProof.rfc3161_timestamp}
                            </p>
                          </div>
                        </div>
                      )}

                      {signatureResult.signature.includes_thought_signatures && (
                        <div className="flex items-center gap-2 p-3 bg-secondary/10 border border-secondary/30 rounded-lg">
                          <Brain className="w-5 h-5 text-secondary" />
                          <div>
                            <p className="font-medium text-secondary">Includes Thought Signatures</p>
                            <p className="text-sm text-muted-foreground">
                              Gemini cognitive trace is included in signed payload
                            </p>
                          </div>
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Cpu className="w-5 h-5 text-secondary" />
                        Model Information
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <p className="text-sm text-muted-foreground">Provider</p>
                          <p className="font-medium">{signatureResult.signedPayload.model.provider}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Model ID</p>
                          <p className="font-medium">{signatureResult.signedPayload.model.model_id}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Version</p>
                          <p className="font-medium">{signatureResult.signedPayload.model.model_version}</p>
                        </div>
                        <div>
                          <p className="text-sm text-muted-foreground">Snapshot</p>
                          <p className="font-mono text-sm">{signatureResult.signedPayload.model.model_snapshot}</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Hash className="w-5 h-5 text-warning" />
                        Cryptographic Proof
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Output Hash (SHA-256)</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 p-2 bg-muted/50 rounded text-xs font-mono break-all">
                            {signatureResult.signedPayload.output_hash}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(signatureResult.signedPayload.output_hash, 'Output Hash')}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground mb-1">Signature</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 p-2 bg-muted/50 rounded text-xs font-mono break-all">
                            {signatureResult.signature.signature}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(signatureResult.signature.signature, 'Signature')}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Cognitive Trace Card - Gemini Only */}
                  {signatureResult.cognitive_trace && (
                    <div className="space-y-4">
                      {/* Chain Validation Status */}
                      {chainValidation && (
                        <div className={`flex items-center gap-2 p-3 rounded-lg ${
                          chainValidation.valid 
                            ? 'bg-green-500/10 border border-green-500/30' 
                            : 'bg-destructive/10 border border-destructive/30'
                        }`}>
                          {chainValidation.valid ? (
                            <>
                              <ShieldCheck className="w-5 h-5 text-green-500" />
                              <div>
                                <p className="font-medium text-green-600">Chain Valid</p>
                                <p className="text-xs text-muted-foreground">
                                  All thought signatures form a valid sequential chain
                                </p>
                              </div>
                            </>
                          ) : (
                            <>
                              <ShieldAlert className="w-5 h-5 text-destructive" />
                              <div>
                                <p className="font-medium text-destructive">Chain Invalid</p>
                                {chainValidation.errors.map((err, i) => (
                                  <p key={i} className="text-xs text-muted-foreground">{err}</p>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                      )}

                      {/* Chain Hash */}
                      {chainHash && (
                        <div className="p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm text-muted-foreground">Chain Hash (SHA-256)</span>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => copyToClipboard(chainHash, 'Chain Hash')}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                          <code className="text-xs font-mono text-foreground break-all">
                            {chainHash}
                          </code>
                        </div>
                      )}

                      {/* Toggle between trace views + Export button */}
                      <div className="flex items-center justify-between p-3 bg-muted/30 rounded-lg">
                        <div className="flex items-center gap-2">
                          <Brain className="w-4 h-4 text-primary" />
                          <span className="text-sm font-medium">Cognitive Trace View</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              exportCognitiveTracePDF(signatureResult, {
                                includeRawPayload: true,
                                includeChainHash: chainHash || undefined,
                              });
                              toast.success('PDF exported successfully!');
                            }}
                            className="h-7 text-xs"
                          >
                            <FileDown className="w-3 h-3 mr-1" />
                            Export PDF
                          </Button>
                          <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                            <Button
                              variant={traceView === 'detailed' ? 'default' : 'ghost'}
                              size="sm"
                              onClick={() => setTraceView('detailed')}
                              className="h-7 text-xs"
                            >
                              <Workflow className="w-3 h-3 mr-1" />
                              Détaillé
                            </Button>
                            <Button
                              variant={traceView === 'unified' ? 'default' : 'ghost'}
                              size="sm"
                              onClick={() => setTraceView('unified')}
                              className="h-7 text-xs"
                            >
                              <Brain className="w-3 h-3 mr-1" />
                              Unifié
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Conditional trace display */}
                      {traceView === 'detailed' ? (
                        <GeminiThoughtTrace
                          thoughtSignatures={signatureResult.cognitive_trace.thought_signatures}
                          reasoningSteps={signatureResult.cognitive_trace.reasoning_steps}
                          functionCalls={signatureResult.cognitive_trace.function_calls}
                          onCopySignature={copyToClipboard}
                        />
                      ) : (
                        <ReasoningTrace
                          steps={signatureResult.cognitive_trace.thought_signatures.map((sig) => ({
                            step_index: sig.step_index,
                            type: sig.step_type as ReasoningStep['type'],
                            content: sig.associated_function 
                              ? `Function: ${sig.associated_function}\n\nSignature: ${sig.signature}`
                              : `Reasoning step with signature: ${sig.signature}`,
                            thought_signature: sig.signature,
                          }))}
                          quality={signatureResult.signedPayload.model.provider === 'google' ? 'native' : 'structured'}
                          provider={signatureResult.signedPayload.model.provider}
                        />
                      )}
                    </div>
                  )}

                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle>Signed Payload (JSON)</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CodeBlock 
                        code={JSON.stringify({
                          ...signatureResult.signedPayload,
                          cognitive_trace: signatureResult.cognitive_trace
                        }, null, 2)} 
                        language="json"
                      />
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-center h-full"
                >
                  <Card className="glass-card w-full">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                      <FileSignature className="w-16 h-16 text-muted-foreground/30 mb-4" />
                      <h3 className="text-lg font-medium text-muted-foreground">No Signature Yet</h3>
                      <p className="text-sm text-muted-foreground/70 mt-1">
                        Fill in the form and click "Sign AI Response" to create a cryptographic signature
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </TabsContent>

        {/* Blockchain Anchor Tab */}
        <TabsContent value="anchor" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Link2 className="w-5 h-5 text-primary" />
                  Anchor to Blockchain
                </CardTitle>
                <CardDescription>
                  Create an immutable on-chain record of your signed AI response
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {signatureResult ? (
                  <>
                    <div className="p-4 bg-muted/50 rounded-lg space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Signature ID</span>
                        <code className="font-mono text-sm">{signatureResult.signatureId}</code>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Output Hash</span>
                        <code className="font-mono text-xs truncate max-w-[200px]">
                          {signatureResult.signedPayload.output_hash.substring(0, 16)}...
                        </code>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-muted-foreground">Model</span>
                        <span className="text-sm font-medium">
                          {signatureResult.signedPayload.model.provider}/{signatureResult.signedPayload.model.model_id}
                        </span>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label>Select Blockchain Network</Label>
                      <Select 
                        value={selectedNetwork} 
                        onValueChange={(v) => setSelectedNetwork(v as 'polygon' | 'ethereum')}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="polygon">
                            <div className="flex items-center gap-2">
                              <div className="w-4 h-4 rounded-full bg-purple-500" />
                              Polygon (Recommended)
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        {selectedNetwork === 'polygon' 
                          ? 'Lower gas fees, faster confirmation (~2s)'
                          : 'Higher security, slower confirmation (~15s)'}
                      </p>
                    </div>

                    <Button 
                      onClick={handleAnchor} 
                      disabled={isAnchoring}
                      className="w-full"
                    >
                      {isAnchoring ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Anchoring to {selectedNetwork}...
                        </>
                      ) : (
                        <>
                          <Link2 className="w-4 h-4 mr-2" />
                          Anchor Signature On-Chain
                        </>
                      )}
                    </Button>
                  </>
                ) : (
                  <div className="text-center py-8">
                    <FileSignature className="w-12 h-12 text-muted-foreground/30 mx-auto mb-3" />
                    <p className="text-muted-foreground">
                      Sign a response first to anchor it on-chain
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Anchor Result */}
            <AnimatePresence mode="wait">
              {anchorResult ? (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-4"
                >
                  <Card className="glass-card border-green-500/50">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle2 className="w-5 h-5 text-green-500" />
                        Anchored Successfully
                        <StatusBadge status="success">Confirmed</StatusBadge>
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="p-4 bg-green-500/10 border border-green-500/30 rounded-lg">
                        <p className="text-sm text-muted-foreground mb-1">Transaction Hash</p>
                        <div className="flex items-center gap-2">
                          <code className="flex-1 text-xs font-mono break-all">
                            {anchorResult.transactionHash}
                          </code>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(anchorResult.transactionHash, 'Transaction Hash')}
                          >
                            <Copy className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        <div className="p-3 bg-muted/30 rounded-lg">
                          <p className="text-sm text-muted-foreground">Network</p>
                          <p className="font-medium capitalize">{anchorResult.network}</p>
                        </div>
                        <div className="p-3 bg-muted/30 rounded-lg">
                          <p className="text-sm text-muted-foreground">Block Number</p>
                          <p className="font-mono font-medium">{anchorResult.blockNumber.toLocaleString()}</p>
                        </div>
                        <div className="p-3 bg-muted/30 rounded-lg">
                          <p className="text-sm text-muted-foreground">Status</p>
                          <StatusBadge status={anchorResult.status === 'confirmed' ? 'success' : 'pending'}>
                            {anchorResult.status}
                          </StatusBadge>
                        </div>
                        <div className="p-3 bg-muted/30 rounded-lg">
                          <p className="text-sm text-muted-foreground">Timestamp</p>
                          <p className="text-sm font-medium">
                            {new Date(anchorResult.timestamp).toLocaleTimeString()}
                          </p>
                        </div>
                      </div>

                      <Button
                        variant="outline"
                        className="w-full"
                        onClick={() => window.open(anchorResult.explorerUrl, '_blank')}
                      >
                        <ExternalLink className="w-4 h-4 mr-2" />
                        View on {anchorResult.network === 'polygon' ? 'PolygonScan' : 'Etherscan'}
                      </Button>
                    </CardContent>
                  </Card>

                  <Card className="glass-card">
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Shield className="w-5 h-5 text-secondary" />
                        Verification Info
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <p className="text-sm text-muted-foreground">
                        This signature is now permanently recorded on the {anchorResult.network} blockchain. 
                        Anyone can verify its authenticity using the transaction hash.
                      </p>
                      <div className="flex items-center gap-2 p-3 bg-primary/10 border border-primary/30 rounded-lg">
                        <CheckCircle2 className="w-5 h-5 text-primary flex-shrink-0" />
                        <div>
                          <p className="font-medium text-primary">Immutable Record Created</p>
                          <p className="text-xs text-muted-foreground">
                            Signature ID: {signatureResult?.signatureId}
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              ) : (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="flex items-center justify-center"
                >
                  <Card className="glass-card w-full">
                    <CardContent className="flex flex-col items-center justify-center py-12 text-center">
                      <Link2 className="w-16 h-16 text-muted-foreground/30 mb-4" />
                      <h3 className="text-lg font-medium text-muted-foreground">Not Anchored Yet</h3>
                      <p className="text-sm text-muted-foreground/70 mt-1">
                        Select a network and click "Anchor" to create an on-chain record
                      </p>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </TabsContent>

        <TabsContent value="verify" className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="glass-card">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="w-5 h-5 text-primary" />
                  Ed25519 Signature Verification
                </CardTitle>
                <CardDescription>
                  Verify an AI response signature against its signed payload
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="verifySignatureId">Signature ID (optional)</Label>
                  <Input
                    id="verifySignatureId"
                    placeholder="sig_abc123..."
                    value={verifySignatureId}
                    onChange={(e) => setVerifySignatureId(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="verifyPayloadJson">Signature Payload (JSON)</Label>
                  <Textarea
                    id="verifyPayloadJson"
                    placeholder={'Paste the full signature response JSON here...\n{\n  "signature_id": "sig_...",\n  "signed_payload": {...},\n  "signature": {...}\n}'}
                    className="min-h-[200px] font-mono text-xs"
                    value={verifyPayloadJson}
                    onChange={(e) => setVerifyPayloadJson(e.target.value)}
                  />
                </div>

                {signatureResult && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setVerifySignatureId(signatureResult.signatureId);
                      setVerifyPayloadJson(JSON.stringify({
                        signature_id: signatureResult.signatureId,
                        signed_payload: signatureResult.signedPayload,
                        signature: signatureResult.signature,
                        cognitive_trace: signatureResult.cognitive_trace,
                      }, null, 2));
                    }}
                    className="w-full"
                  >
                    Use Last Signed Response
                  </Button>
                )}

                <Button 
                  onClick={handleVerify} 
                  disabled={isVerifying}
                  className="w-full"
                >
                  {isVerifying ? (
                    <>
                      <LoadingSpinner size="sm" className="mr-2" />
                      Verifying Ed25519 Signature...
                    </>
                  ) : (
                    <>
                      <ShieldCheck className="w-4 h-4 mr-2" />
                      Verify Signature
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <AnimatePresence mode="wait">
              {verifyResult && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  className="space-y-4"
                >
                  <Card className={`glass-card ${verifyResult.valid ? 'border-green-500/50' : 'border-destructive/50'}`}>
                    <CardContent className="py-8">
                      <div className="flex flex-col items-center text-center mb-6">
                        {verifyResult.valid ? (
                          <>
                            <div className="w-20 h-20 rounded-full bg-green-500/20 flex items-center justify-center mb-4">
                              <CheckCircle2 className="w-10 h-10 text-green-500" />
                            </div>
                            <h3 className="text-2xl font-bold text-green-600">Ed25519 Signature Valid</h3>
                            <p className="text-muted-foreground mt-2">
                              The signature has been cryptographically verified
                            </p>
                          </>
                        ) : (
                          <>
                            <div className="w-20 h-20 rounded-full bg-destructive/20 flex items-center justify-center mb-4">
                              <AlertCircle className="w-10 h-10 text-destructive" />
                            </div>
                            <h3 className="text-2xl font-bold text-destructive">Verification Failed</h3>
                            <p className="text-muted-foreground mt-2">
                              The signature could not be verified
                            </p>
                          </>
                        )}
                      </div>

                      {/* Verification Details */}
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div className="p-3 bg-muted/30 rounded-lg">
                            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                              <Settings className="w-3 h-3" />
                              Algorithm
                            </div>
                            <p className="font-medium font-mono text-sm">{verifyResult.details.signatureAlgorithm}</p>
                          </div>
                          <div className="p-3 bg-muted/30 rounded-lg">
                            <div className="flex items-center gap-2 text-muted-foreground text-xs mb-1">
                              <Brain className="w-3 h-3" />
                              Cognitive Trace
                            </div>
                            <p className="font-medium text-sm">
                              {verifyResult.details.cognitiveTraceIncluded ? 'Included' : 'Not Included'}
                            </p>
                          </div>
                        </div>

                        <div className="p-3 bg-muted/30 rounded-lg">
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-xs text-muted-foreground flex items-center gap-1">
                              <Hash className="w-3 h-3" />
                              Payload Hash (SHA-256)
                            </span>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 px-2"
                              onClick={() => copyToClipboard(verifyResult.details.payloadHash, 'Payload Hash')}
                            >
                              <Copy className="w-3 h-3" />
                            </Button>
                          </div>
                          <code className="text-xs font-mono break-all text-foreground">
                            {verifyResult.details.payloadHash}
                          </code>
                        </div>

                        {verifyResult.details.chainHashValid !== undefined && (
                          <div className={`p-3 rounded-lg ${verifyResult.details.chainHashValid ? 'bg-green-500/10 border border-green-500/30' : 'bg-destructive/10 border border-destructive/30'}`}>
                            <div className="flex items-center gap-2">
                              {verifyResult.details.chainHashValid ? (
                                <ShieldCheck className="w-4 h-4 text-green-500" />
                              ) : (
                                <ShieldAlert className="w-4 h-4 text-destructive" />
                              )}
                              <span className={`font-medium text-sm ${verifyResult.details.chainHashValid ? 'text-green-600' : 'text-destructive'}`}>
                                Thought Signature Chain: {verifyResult.details.chainHashValid ? 'Valid' : 'Invalid'}
                              </span>
                            </div>
                          </div>
                        )}

                        {verifyResult.errors && verifyResult.errors.length > 0 && (
                          <div className="p-3 bg-destructive/10 border border-destructive/30 rounded-lg">
                            <p className="text-sm font-medium text-destructive mb-2">Verification Errors:</p>
                            <ul className="text-xs text-muted-foreground space-y-1">
                              {verifyResult.errors.map((err, i) => (
                                <li key={i} className="flex items-start gap-2">
                                  <AlertCircle className="w-3 h-3 text-destructive mt-0.5 flex-shrink-0" />
                                  {err}
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}

                        <p className="text-xs text-muted-foreground text-center pt-2">
                          Verified at: {new Date(verifyResult.verifiedAt).toLocaleString()}
                        </p>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </TabsContent>
      </Tabs>
    </MainLayout>
  );
};

export default AISignature;
