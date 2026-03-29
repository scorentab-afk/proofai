import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Package, CheckCircle2, ArrowRight, Copy, Clock, Hash, FileSignature, Link2, ExternalLink, Shield, Sparkles } from 'lucide-react';
import { readPipelineParams, isAutoRun, navigatePipeline } from '@/lib/pipeline-params';
import { MainLayout } from '@/components/layout/MainLayout';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CodeBlock } from '@/components/shared/CodeBlock';
import { LoadingOverlay } from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { api, EvidenceBundleResult, BlockchainAnchorResult } from '@/api/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { format } from 'date-fns';
import { useNavigate, useLocation } from 'react-router-dom';

export default function EvidenceBundle() {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const autoRunTriggered = useRef(false);

  const pipelineData = readPipelineParams(searchParams);
  const autoRun = isAutoRun(searchParams);

  const [formData, setFormData] = useState({
    promptId: '',
    executionId: '',
    analysisId: '',
    signatureId: '',
    cognitiveHash: '',
  });
  const [currentStep, setCurrentStep] = useState(1);

  // Auto-fill from pipeline
  useEffect(() => {
    const newData = { ...formData };
    let filled = 0;
    const fields = ['promptId', 'executionId', 'analysisId', 'signatureId', 'cognitiveHash'] as const;
    for (const field of fields) {
      const val = pipelineData[field];
      if (val) {
        newData[field] = val;
        filled++;
      }
    }
    if (filled > 0) {
      setFormData(newData);
      setCurrentStep(Math.min(filled + 1, steps.length));
    }
  }, [searchParams]);

  // Auto-create bundle
  useEffect(() => {
    if (autoRun && !autoRunTriggered.current && !isLoading && !result) {
      const allFilled = pipelineData.promptId && pipelineData.executionId && pipelineData.analysisId && pipelineData.signatureId && pipelineData.cognitiveHash;
      if (allFilled) {
        autoRunTriggered.current = true;
        setTimeout(() => handleAutoCreateBundle(), 300);
      }
    }
  }, [autoRun, searchParams]);
  const [isLoading, setIsLoading] = useState(false);
  const [isAnchoring, setIsAnchoring] = useState(false);
  const [result, setResult] = useState<EvidenceBundleResult | null>(null);
  const [anchorResult, setAnchorResult] = useState<BlockchainAnchorResult | null>(null);
  const [selectedNetwork, setSelectedNetwork] = useState<'polygon' | 'ethereum'>('polygon');

  const steps = [
    { number: 1, title: 'Prompt ID', field: 'promptId', placeholder: 'Enter compressed prompt ID', icon: Package },
    { number: 2, title: 'Execution ID', field: 'executionId', placeholder: 'Enter AI execution ID', icon: Package },
    { number: 3, title: 'Analysis ID', field: 'analysisId', placeholder: 'Enter cognitive analysis ID', icon: Package },
    { number: 4, title: 'Signature ID', field: 'signatureId', placeholder: 'Enter AI signature ID', icon: FileSignature },
    { number: 5, title: 'Cognitive Hash', field: 'cognitiveHash', placeholder: 'Enter cognitive hash from analysis', icon: Hash },
  ];

  const handleNext = () => {
    const currentField = steps[currentStep - 1].field as keyof typeof formData;
    if (!formData[currentField].trim()) {
      toast.error(`Please enter ${steps[currentStep - 1].title}`);
      return;
    }
    if (currentStep < steps.length) {
      setCurrentStep(currentStep + 1);
    }
  };

  const handleAutoCreateBundle = async () => {
    setIsLoading(true);
    const stateData = (location.state as Record<string, unknown>) || {};
    try {
      const response = await api.createEvidenceBundle(
        pipelineData.promptId!,
        pipelineData.executionId!,
        pipelineData.analysisId!,
        pipelineData.signatureId!,
        pipelineData.cognitiveHash!,
        stateData.originalPrompt as string | undefined,
        stateData.aiResponse as string | undefined,
      );
      setResult(response);
      toast.success('Evidence bundle created successfully!');
      navigatePipeline(navigate, '/anchor', { bundleId: response.id });
    } catch (error) {
      toast.error('Failed to create bundle');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCreateBundle = async () => {
    if (!formData.cognitiveHash.trim()) {
      toast.error('Please complete all fields');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.createEvidenceBundle(
        formData.promptId,
        formData.executionId,
        formData.analysisId,
        formData.signatureId,
        formData.cognitiveHash
      );
      setResult(response);
      toast.success('Evidence bundle created successfully!');
    } catch (error) {
      toast.error('Failed to create bundle');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopyHash = (hash: string) => {
    navigator.clipboard.writeText(hash);
    toast.success('Hash copied to clipboard');
  };

  const handleAnchorToBlockchain = async () => {
    if (!result) return;
    
    setIsAnchoring(true);
    try {
      const response = await api.anchorToBlockchain(result.id, selectedNetwork);
      setAnchorResult(response);
      setResult({ ...result, status: 'anchored' });
      toast.success(`Successfully anchored to ${selectedNetwork}!`);
    } catch (error) {
      toast.error('Failed to anchor to blockchain');
    } finally {
      setIsAnchoring(false);
    }
  };

  const handleLoadDemoData = () => {
    const demoData = {
      promptId: 'prompt_gemini_2025_001',
      executionId: 'exec_cognitive_analysis_001',
      analysisId: 'analysis_knowledge_graph_001',
      signatureId: 'sig_ed25519_a1b2c3d4e5f6',
      cognitiveHash: 'sha256_8f14e45fceea167a5a36dedd4bea2543b7e3c8f9d1e0a2b4c6d8e0f1a3b5c7d9',
    };
    setFormData(demoData);
    setCurrentStep(steps.length);
    toast.success('Demo data loaded! Ready to create bundle.');
  };

  return (
    <MainLayout title="Evidence Bundle" subtitle="Create immutable evidence packages">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Form Section */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <Card className="relative overflow-hidden">
            <AnimatePresence>
              {isLoading && <LoadingOverlay message="Creating evidence bundle..." />}
            </AnimatePresence>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <Package className="h-5 w-5 text-success" />
                    Bundle Configuration
                  </CardTitle>
                  <CardDescription className="mt-1.5">
                    Collect all evidence components to create an immutable bundle
                  </CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleLoadDemoData}
                  className="shrink-0"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Load Demo
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Progress Steps */}
              <div className="flex items-center justify-between mb-6">
                {steps.map((step, index) => (
                  <div key={step.number} className="flex items-center">
                    <div
                      className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-all ${
                        currentStep > step.number
                          ? 'bg-success text-success-foreground'
                          : currentStep === step.number
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted text-muted-foreground'
                      }`}
                    >
                      {currentStep > step.number ? (
                        <CheckCircle2 className="h-4 w-4" />
                      ) : (
                        step.number
                      )}
                    </div>
                    {index < steps.length - 1 && (
                      <div
                        className={`h-0.5 w-8 mx-1 ${
                          currentStep > step.number ? 'bg-success' : 'bg-muted'
                        }`}
                      />
                    )}
                  </div>
                ))}
              </div>

              {/* Current Step Input */}
              {steps.map((step) => (
                <motion.div
                  key={step.number}
                  initial={false}
                  animate={{
                    height: currentStep === step.number ? 'auto' : 0,
                    opacity: currentStep === step.number ? 1 : 0,
                  }}
                  className="overflow-hidden"
                >
                  {currentStep === step.number && (
                    <div className="space-y-2">
                      <Label>{step.title}</Label>
                      <Input
                        placeholder={step.placeholder}
                        value={formData[step.field as keyof typeof formData]}
                        onChange={(e) =>
                          setFormData({ ...formData, [step.field]: e.target.value })
                        }
                        className="font-mono"
                      />
                    </div>
                  )}
                </motion.div>
              ))}

              {/* Completed Fields Summary */}
              {currentStep > 1 && (
                <div className="space-y-2 pt-4 border-t">
                  <Label className="text-xs text-muted-foreground">Collected Data</Label>
                  {steps.slice(0, currentStep - 1).map((step) => (
                    <div key={step.number} className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">{step.title}:</span>
                      <code className="text-xs bg-muted px-2 py-0.5 rounded truncate max-w-[200px]">
                        {formData[step.field as keyof typeof formData]}
                      </code>
                    </div>
                  ))}
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3">
                {currentStep > 1 && (
                  <Button
                    variant="outline"
                    onClick={() => setCurrentStep(currentStep - 1)}
                    className="flex-1"
                  >
                    Back
                  </Button>
                )}
                {currentStep < steps.length ? (
                  <Button onClick={handleNext} className="flex-1">
                    Next Step
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                ) : (
                  <Button
                    onClick={handleCreateBundle}
                    className="flex-1"
                    disabled={isLoading}
                  >
                    <Package className="mr-2 h-4 w-4" />
                    Create Bundle
                  </Button>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Results Section */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <AnimatePresence mode="wait">
            {result ? (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Bundle Summary */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Bundle Created</CardTitle>
                        <CardDescription>
                          ID: <code className="text-xs">{result.id}</code>
                        </CardDescription>
                      </div>
                      <StatusBadge status="success">Created</StatusBadge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="rounded-lg bg-success/10 border border-success/20 p-4">
                      <div className="flex items-start gap-3">
                        <CheckCircle2 className="h-5 w-5 text-success mt-0.5" />
                        <div className="flex-1">
                          <p className="font-medium text-success">Bundle Hash Generated</p>
                          <div className="flex items-center gap-2 mt-2">
                            <code className="text-xs text-muted-foreground break-all">
                              {result.bundleHash}
                            </code>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6 shrink-0"
                              onClick={() => handleCopyHash(result.bundleHash)}
                            >
                              <Copy className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Anchor to Blockchain Section */}
                    {!anchorResult ? (
                      <div className="rounded-lg border border-border p-4 space-y-4">
                        <div className="flex items-center gap-2">
                          <Link2 className="h-5 w-5 text-primary" />
                          <p className="font-medium">Anchor to Blockchain</p>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          Inscribe this bundle hash on a public blockchain for immutable proof.
                        </p>
                        <div className="flex gap-3">
                          <Select
                            value={selectedNetwork}
                            onValueChange={(value) => setSelectedNetwork(value as 'polygon' | 'ethereum')}
                          >
                            <SelectTrigger className="w-[160px]">
                              <SelectValue placeholder="Select network" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="polygon">Polygon</SelectItem>
                              <SelectItem value="ethereum">Ethereum</SelectItem>
                            </SelectContent>
                          </Select>
                          <Button 
                            onClick={handleAnchorToBlockchain} 
                            disabled={isAnchoring}
                            className="flex-1"
                          >
                            {isAnchoring ? (
                              <>Anchoring...</>
                            ) : (
                              <>
                                <Link2 className="mr-2 h-4 w-4" />
                                Anchor Now
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="rounded-lg bg-primary/10 border border-primary/20 p-4 space-y-3">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-primary" />
                          <p className="font-medium text-primary">Anchored to {anchorResult.network}</p>
                        </div>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Block Number:</span>
                            <code className="text-xs">{anchorResult.blockNumber}</code>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Transaction:</span>
                            <code className="text-xs truncate max-w-[200px]">
                              {anchorResult.transactionHash.substring(0, 20)}...
                            </code>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => window.open(anchorResult.explorerUrl, '_blank')}
                          >
                            <ExternalLink className="mr-2 h-4 w-4" />
                            View on Explorer
                          </Button>
                          <Button
                            size="sm"
                            className="flex-1"
                            onClick={() => navigate(`/verify?bundleId=${result.id}`)}
                          >
                            <Shield className="mr-2 h-4 w-4" />
                            Verify Bundle
                          </Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Timeline */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Clock className="h-5 w-5" />
                      Evidence Timeline
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {result.timeline.map((event, index) => (
                        <div key={index} className="flex gap-4">
                          <div className="flex flex-col items-center">
                            <div className="h-3 w-3 rounded-full bg-primary" />
                            {index < result.timeline.length - 1 && (
                              <div className="w-0.5 flex-1 bg-border mt-1" />
                            )}
                          </div>
                          <div className="pb-4">
                            <p className="font-medium text-sm">{event.event}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(new Date(event.timestamp), 'PPpp')}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <Hash className="h-3 w-3 text-muted-foreground" />
                              <code className="text-xs text-muted-foreground">
                                {event.hash}...
                              </code>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>

                {/* Raw Bundle Data */}
                <Card>
                  <CardHeader>
                    <CardTitle>Bundle Data</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CodeBlock
                      code={JSON.stringify({
                        bundleId: result.id,
                        promptId: result.promptId,
                        executionId: result.executionId,
                        analysisId: result.analysisId,
                        signatureId: result.signatureId,
                        cognitiveHash: result.cognitiveHash,
                        bundleHash: result.bundleHash,
                        status: result.status,
                        createdAt: result.createdAt,
                      }, null, 2)}
                      language="JSON"
                    />
                  </CardContent>
                </Card>
              </motion.div>
            ) : (
              <motion.div
                key="placeholder"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Card className="h-[500px] flex items-center justify-center">
                  <div className="text-center p-8">
                    <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center mb-4">
                      <Package className="h-8 w-8 text-success" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Create Evidence Bundle
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Complete the multi-step form to collect all evidence components and create an immutable bundle.
                    </p>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </MainLayout>
  );
}
