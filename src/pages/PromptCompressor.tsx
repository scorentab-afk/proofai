import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Cpu, Sparkles, ArrowRight, Copy, Check } from 'lucide-react';
import { navigatePipeline } from '@/lib/pipeline-params';
import { MainLayout } from '@/components/layout/MainLayout';
import { MetricCard } from '@/components/shared/MetricCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CodeBlock } from '@/components/shared/CodeBlock';
import { LoadingOverlay } from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { toast } from 'sonner';
import { api, CompressPromptResult } from '@/api/client';
import { ProviderSelector, type AIProvider } from '@/components/shared/ProviderSelector';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';

export default function PromptCompressor() {
  const navigate = useNavigate();
  const [prompt, setPrompt] = useState('');
  const [compressionLevel, setCompressionLevel] = useState<'low' | 'medium' | 'high'>('medium');
  const [preserveContext, setPreserveContext] = useState(true);
  const [targetModel, setTargetModel] = useState('gpt-4');
  const [provider, setProvider] = useState<AIProvider>('anthropic');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CompressPromptResult | null>(null);
  const [copied, setCopied] = useState(false);

  const handleCompress = async () => {
    if (!prompt.trim()) {
      toast.error('Please enter a prompt to compress');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.compressPrompt(prompt, {
        compressionLevel,
        preserveContext,
        targetModels: [targetModel],
      });
      setResult(response);
      toast.success('Prompt compressed successfully!');
      // Store prompt for bundle creation later
      sessionStorage.setItem('proofai_originalPrompt', prompt);
      // Auto-navigate to AI Execution with chosen provider
      navigatePipeline(navigate, '/execute', { promptId: response.id }, { promptText: response.compressedDsl, provider, originalPrompt: prompt });
    } catch (error) {
      toast.error('Failed to compress prompt');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCopy = () => {
    if (result) {
      navigator.clipboard.writeText(result.compressedDsl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const chartData = result ? [
    { name: 'Original', tokens: result.metrics.originalTokens, fill: 'hsl(var(--muted-foreground))' },
    { name: 'Compressed', tokens: result.metrics.compressedTokens, fill: 'hsl(var(--primary))' },
  ] : [];

  return (
    <MainLayout title="Prompt Compressor" subtitle="Compress prompts into efficient DSL format">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Input Section */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <Card className="relative overflow-hidden">
            <AnimatePresence>
              {isLoading && <LoadingOverlay message="Compressing prompt..." />}
            </AnimatePresence>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Cpu className="h-5 w-5 text-primary" />
                Input Prompt
              </CardTitle>
              <CardDescription>
                Enter the prompt you want to compress into DSL format
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Enter your prompt here... 

Example: Analyze the following document and extract key insights about customer sentiment, product feedback, and areas for improvement. Provide a structured summary with confidence scores for each finding."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="min-h-[200px] resize-none font-mono text-sm"
              />
              <div className="flex items-center justify-between text-sm text-muted-foreground">
                <span>{prompt.length} characters</span>
                <span>~{Math.ceil(prompt.length / 4)} tokens</span>
              </div>
            </CardContent>
          </Card>

          {/* Configuration */}
          <Card>
            <CardHeader>
              <CardTitle>Compression Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-2">
                <Label>Target Model</Label>
                <Select value={targetModel} onValueChange={setTargetModel}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="gpt-4">GPT-4</SelectItem>
                    <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                    <SelectItem value="claude-3-opus">Claude 3 Opus</SelectItem>
                    <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                    <SelectItem value="gemini-pro">Gemini Pro</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <Label>Compression Level</Label>
                  <StatusBadge status={compressionLevel === 'high' ? 'ai' : 'info'}>
                    {compressionLevel.charAt(0).toUpperCase() + compressionLevel.slice(1)}
                  </StatusBadge>
                </div>
                <Slider
                  value={[compressionLevel === 'low' ? 0 : compressionLevel === 'medium' ? 50 : 100]}
                  onValueChange={([val]) => {
                    if (val < 33) setCompressionLevel('low');
                    else if (val < 66) setCompressionLevel('medium');
                    else setCompressionLevel('high');
                  }}
                  max={100}
                  step={1}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-muted-foreground">
                  <span>Lower compression</span>
                  <span>Higher compression</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Preserve Context</Label>
                  <p className="text-xs text-muted-foreground">
                    Maintain semantic meaning during compression
                  </p>
                </div>
                <Switch checked={preserveContext} onCheckedChange={setPreserveContext} />
              </div>

              <Button onClick={handleCompress} className="w-full" size="lg" disabled={isLoading}>
                <Sparkles className="mr-2 h-4 w-4" />
                Compress & Run Pipeline
                <ArrowRight className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          {/* AI Provider Selection for Pipeline */}
          <ProviderSelector value={provider} onChange={setProvider} />
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
                {/* Metrics */}
                <div className="grid gap-4 md:grid-cols-2">
                  <MetricCard
                    label="Compression Ratio"
                    value={`${(result.metrics.compressionRatio * 100).toFixed(0)}%`}
                    change="Tokens saved"
                    changeType="positive"
                  />
                  <MetricCard
                    label="Semantic Loss"
                    value={`${(result.metrics.semanticLoss * 100).toFixed(1)}%`}
                    change="Meaning preserved"
                    changeType={result.metrics.semanticLoss < 0.05 ? 'positive' : 'negative'}
                  />
                </div>

                {/* Comparison Chart */}
                <Card>
                  <CardHeader>
                    <CardTitle>Token Comparison</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={150}>
                      <BarChart data={chartData} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                        <XAxis type="number" />
                        <YAxis type="category" dataKey="name" width={80} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: 'hsl(var(--card))',
                            border: '1px solid hsl(var(--border))',
                            borderRadius: '8px',
                          }}
                        />
                        <Bar dataKey="tokens" radius={[0, 4, 4, 0]}>
                          {chartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.fill} />
                          ))}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>

                {/* DSL Output */}
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle>Compressed DSL Output</CardTitle>
                        <CardDescription>
                          ID: <code className="text-xs">{result.id}</code>
                        </CardDescription>
                      </div>
                      <Button variant="outline" size="sm" onClick={handleCopy}>
                        {copied ? (
                          <>
                            <Check className="mr-2 h-4 w-4 text-success" />
                            Copied
                          </>
                        ) : (
                          <>
                            <Copy className="mr-2 h-4 w-4" />
                            Copy
                          </>
                        )}
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <CodeBlock code={result.compressedDsl} language="DSL" />
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
                <Card className="h-full min-h-[400px] flex items-center justify-center">
                  <div className="text-center p-8">
                    <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-primary/20 to-secondary/20 flex items-center justify-center mb-4">
                      <Cpu className="h-8 w-8 text-primary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Ready to Compress
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Enter a prompt and configure your settings to see the compressed DSL output with metrics.
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
