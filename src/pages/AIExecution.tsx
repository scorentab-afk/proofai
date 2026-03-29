import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Play, Terminal, Clock, Coins, Server } from 'lucide-react';
import { readPipelineParams, isAutoRun, navigatePipeline } from '@/lib/pipeline-params';
import { MainLayout } from '@/components/layout/MainLayout';
import { MetricCard } from '@/components/shared/MetricCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CodeBlock } from '@/components/shared/CodeBlock';
import { LoadingOverlay } from '@/components/shared/LoadingSpinner';
import { ProviderSelector, AIProvider, getModelForProvider } from '@/components/shared/ProviderSelector';
import { ReasoningTrace, ReasoningStep } from '@/components/shared/ReasoningTrace';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { api, ExecuteAIResult } from '@/api/client';

export default function AIExecution() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const autoRunTriggered = useRef(false);

  const [promptRef, setPromptRef] = useState('');
  const [provider, setProvider] = useState<AIProvider>('gemini');
  const [temperature, setTemperature] = useState([0.7]);
  const [maxTokens, setMaxTokens] = useState([1024]);
  const [streaming, setStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<ExecuteAIResult | null>(null);

  const pipelineData = readPipelineParams(searchParams);
  const autoRun = isAutoRun(searchParams);

  // Auto-fill from pipeline params
  useEffect(() => {
    if (pipelineData.promptId && !promptRef) {
      setPromptRef(pipelineData.promptId);
    }
    // Read provider from navigation state
    const stateProvider = (location.state as Record<string, unknown>)?.provider as AIProvider;
    if (stateProvider) {
      setProvider(stateProvider);
    }
  }, [pipelineData.promptId, location.state]);

  // Auto-execute if autoRun
  useEffect(() => {
    if (autoRun && pipelineData.promptId && !autoRunTriggered.current && !isLoading && !result) {
      autoRunTriggered.current = true;
      const stateProvider = (location.state as Record<string, unknown>)?.provider as AIProvider;
      setTimeout(() => handleExecute(pipelineData.promptId, stateProvider), 500);
    }
  }, [autoRun, pipelineData.promptId]);

  const handleProviderChange = (newProvider: AIProvider) => {
    setProvider(newProvider);
  };

  const handleExecute = async (overridePromptRef?: string, overrideProvider?: AIProvider) => {
    const ref = overridePromptRef || promptRef;
    const activeProvider = overrideProvider || provider;
    if (!ref.trim()) {
      toast.error('Please enter a prompt reference ID');
      return;
    }

    setIsLoading(true);
    try {
      const modelId = getModelForProvider(activeProvider);
      const response = await api.executeAI(ref, {
        provider: activeProvider,
        modelId,
        temperature: temperature[0],
        maxTokens: maxTokens[0],
        stream: streaming,
      });
      setResult(response);
      toast.success('AI execution completed with reasoning trace!');
      // Store AI response for bundle creation later
      sessionStorage.setItem('proofai_aiResponse', response.output);
      // Auto-navigate to Cognitive Analysis
      if (autoRun || pipelineData.promptId) {
        navigatePipeline(
          navigate,
          '/analyze',
          { ...pipelineData, promptId: pipelineData.promptId || ref, executionId: response.id },
          { analysisText: response.output, originalPrompt: (location.state as Record<string, unknown>)?.originalPrompt, aiResponse: response.output },
        );
      }
    } catch (error) {
      toast.error('Execution failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MainLayout title="AI Execution" subtitle="Execute compressed prompts with cognitive reasoning trace">
      <div className="space-y-6">
        {/* Provider Selector */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <ProviderSelector value={provider} onChange={handleProviderChange} />
        </motion.div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Configuration */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1 }}
            className="space-y-6"
          >
            <Card className="relative overflow-hidden">
              <AnimatePresence>
                {isLoading && <LoadingOverlay message="Executing AI model with reasoning trace..." />}
              </AnimatePresence>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5 text-primary" />
                  Execution Configuration
                </CardTitle>
                <CardDescription>
                  Configure execution parameters. Model is auto-selected based on provider.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Prompt Reference */}
                <div className="space-y-2">
                  <Label>Prompt Reference ID</Label>
                  <Input
                    placeholder="e.g., id_1706123456789_abc123"
                    value={promptRef}
                    onChange={(e) => setPromptRef(e.target.value)}
                    className="font-mono"
                  />
                  <p className="text-xs text-muted-foreground">
                    Enter the ID from a previously compressed prompt
                  </p>
                </div>

                {/* Selected Model Display */}
                <div className="space-y-2">
                  <Label>Selected Model</Label>
                  <div className="p-3 bg-muted/50 rounded-lg border">
                    <code className="text-sm font-mono text-foreground">
                      {getModelForProvider(provider)}
                    </code>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Auto-selected based on provider choice above
                  </p>
                </div>

                {/* Temperature */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Temperature</Label>
                    <span className="text-sm font-mono text-muted-foreground">
                      {temperature[0].toFixed(2)}
                    </span>
                  </div>
                  <Slider
                    value={temperature}
                    onValueChange={setTemperature}
                    max={2}
                    step={0.01}
                    className="w-full"
                  />
                  <div className="flex justify-between text-xs text-muted-foreground">
                    <span>Precise</span>
                    <span>Creative</span>
                  </div>
                </div>

                {/* Max Tokens */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label>Max Tokens</Label>
                    <span className="text-sm font-mono text-muted-foreground">
                      {maxTokens[0]}
                    </span>
                  </div>
                  <Slider
                    value={maxTokens}
                    onValueChange={setMaxTokens}
                    min={128}
                    max={4096}
                    step={128}
                    className="w-full"
                  />
                </div>

                {/* Streaming Toggle */}
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Stream Response</Label>
                    <p className="text-xs text-muted-foreground">
                      Enable real-time streaming output
                    </p>
                  </div>
                  <Switch checked={streaming} onCheckedChange={setStreaming} />
                </div>

                <Button onClick={handleExecute} className="w-full" size="lg" disabled={isLoading}>
                  <Play className="mr-2 h-4 w-4" />
                  Execute with Reasoning Trace
                </Button>
              </CardContent>
            </Card>
          </motion.div>

          {/* Results */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2 }}
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
                  {/* Execution Metrics */}
                  <div className="grid gap-4 md:grid-cols-3">
                    <MetricCard
                      label="Latency"
                      value={`${result.metadata.latency}ms`}
                      icon={Clock}
                    />
                    <MetricCard
                      label="Total Tokens"
                      value={result.metadata.tokens.total}
                      icon={Coins}
                    />
                    <MetricCard
                      label="Model"
                      value={result.metadata.model.split('-').slice(0, 2).join('-')}
                      icon={Server}
                    />
                  </div>

                  {/* Output */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Terminal className="h-5 w-5" />
                            Execution Output
                          </CardTitle>
                          <CardDescription>
                            ID: <code className="text-xs">{result.id}</code>
                          </CardDescription>
                        </div>
                        <StatusBadge status="success">Completed</StatusBadge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="rounded-lg bg-muted/50 p-4 border">
                        <p className="text-sm leading-relaxed text-foreground">
                          {result.output}
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Reasoning Trace */}
                  {result.reasoning_trace && result.reasoning_trace.length > 0 && (
                    <ReasoningTrace
                      steps={result.reasoning_trace as ReasoningStep[]}
                      quality={result.trace_quality || 'structured'}
                      provider={result.metadata.provider}
                    />
                  )}

                  {/* Metadata */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Execution Metadata</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <CodeBlock
                        code={JSON.stringify({
                          executionId: result.id,
                          promptRef: result.promptRef,
                          provider: result.metadata.provider,
                          model: result.metadata.model,
                          tokens: result.metadata.tokens,
                          latency: `${result.metadata.latency}ms`,
                          traceQuality: result.trace_quality,
                          reasoningSteps: result.reasoning_trace?.length || 0,
                          timestamp: result.timestamp,
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
                  <Card className="h-full min-h-[500px] flex items-center justify-center">
                    <div className="text-center p-8">
                      <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-orange-500/20 to-yellow-500/20 flex items-center justify-center mb-4">
                        <Zap className="h-8 w-8 text-orange-500" />
                      </div>
                      <h3 className="text-lg font-semibold text-foreground mb-2">
                        Ready to Execute
                      </h3>
                      <p className="text-sm text-muted-foreground max-w-sm">
                        Select a provider above, configure parameters, and provide a prompt reference to see the execution with cognitive reasoning trace.
                      </p>
                    </div>
                  </Card>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </MainLayout>
  );
}
