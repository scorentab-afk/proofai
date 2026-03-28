import { useState, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Link2, ExternalLink, CheckCircle2, Loader2, Shield, Blocks } from 'lucide-react';
import { readPipelineParams, isAutoRun, navigatePipeline } from '@/lib/pipeline-params';
import { MainLayout } from '@/components/layout/MainLayout';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CodeBlock } from '@/components/shared/CodeBlock';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { toast } from 'sonner';
import { api, BlockchainAnchorResult } from '@/api/client';

const networks = [
  {
    id: 'polygon',
    name: 'Polygon',
    description: 'Fast & low-cost L2 network',
    icon: '🟣',
    avgTime: '~5 seconds',
    avgCost: '~$0.01',
  },
  {
    id: 'ethereum',
    name: 'Ethereum',
    description: 'Most secure & decentralized',
    icon: '💎',
    avgTime: '~15 seconds',
    avgCost: '~$2-10',
  },
];

export default function BlockchainAnchor() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const autoRunTriggered = useRef(false);

  const pipelineData = readPipelineParams(searchParams);
  const autoRun = isAutoRun(searchParams);

  const [bundleId, setBundleId] = useState('');
  const [network, setNetwork] = useState<'polygon' | 'ethereum'>('polygon');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<BlockchainAnchorResult | null>(null);

  // Auto-fill
  useEffect(() => {
    if (pipelineData.bundleId && !bundleId) setBundleId(pipelineData.bundleId);
  }, [pipelineData.bundleId]);

  // Auto-run
  useEffect(() => {
    if (autoRun && pipelineData.bundleId && !autoRunTriggered.current && !isLoading && !result) {
      autoRunTriggered.current = true;
      setTimeout(() => handleAnchor(pipelineData.bundleId), 300);
    }
  }, [autoRun, pipelineData.bundleId]);

  const handleAnchor = async (overrideBundleId?: string) => {
    const bid = overrideBundleId || bundleId;
    if (!bid.trim()) {
      toast.error('Please enter a bundle ID');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.anchorToBlockchain(bid, network);
      setResult(response);
      toast.success('Successfully anchored to blockchain!');
      // Auto-navigate to verify
      if (autoRun || pipelineData.bundleId) {
        navigatePipeline(navigate, '/verify', { bundleId: bid });
      }
    } catch (error) {
      toast.error('Failed to anchor to blockchain');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MainLayout title="Blockchain Anchor" subtitle="Anchor evidence bundles to distributed ledger">
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Configuration */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Link2 className="h-5 w-5 text-primary" />
                Anchor Configuration
              </CardTitle>
              <CardDescription>
                Select the bundle and blockchain network for anchoring
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Bundle ID */}
              <div className="space-y-2">
                <Label>Evidence Bundle ID</Label>
                <Input
                  placeholder="e.g., id_1706123456789_abc123"
                  value={bundleId}
                  onChange={(e) => setBundleId(e.target.value)}
                  className="font-mono"
                />
              </div>

              {/* Network Selection */}
              <div className="space-y-3">
                <Label>Blockchain Network</Label>
                <RadioGroup
                  value={network}
                  onValueChange={(val) => setNetwork(val as 'polygon' | 'ethereum')}
                  className="space-y-3"
                >
                  {networks.map((net) => (
                    <div
                      key={net.id}
                      className={`relative flex items-start gap-4 rounded-lg border p-4 cursor-pointer transition-all ${
                        network === net.id
                          ? 'border-primary bg-primary/5'
                          : 'border-border hover:border-muted-foreground/50'
                      }`}
                      onClick={() => setNetwork(net.id as 'polygon' | 'ethereum')}
                    >
                      <RadioGroupItem value={net.id} id={net.id} className="mt-1" />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xl">{net.icon}</span>
                          <Label htmlFor={net.id} className="font-semibold cursor-pointer">
                            {net.name}
                          </Label>
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">
                          {net.description}
                        </p>
                        <div className="flex gap-4 mt-2 text-xs text-muted-foreground">
                          <span>⏱ {net.avgTime}</span>
                          <span>💰 {net.avgCost}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </RadioGroup>
              </div>

              <Button
                onClick={handleAnchor}
                className="w-full"
                size="lg"
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Anchoring to Ledger...
                  </>
                ) : (
                  <>
                    <Link2 className="mr-2 h-4 w-4" />
                    Anchor to Ledger
                  </>
                )}
              </Button>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="bg-muted/30">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="rounded-lg bg-primary/10 p-2.5">
                  <Shield className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <h4 className="font-semibold text-foreground">Immutable Proof</h4>
                  <p className="text-sm text-muted-foreground mt-1">
                    Once anchored, your evidence bundle hash is permanently recorded on the blockchain, 
                    providing tamper-proof verification of its existence and integrity at a specific point in time.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Results */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <AnimatePresence mode="wait">
            {isLoading ? (
              <motion.div
                key="loading"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <Card className="h-[400px] flex items-center justify-center">
                  <div className="text-center">
                    <div className="relative mx-auto w-20 h-20 mb-6">
                      <div className="absolute inset-0 rounded-full border-4 border-primary/20" />
                      <div className="absolute inset-0 rounded-full border-4 border-transparent border-t-primary animate-spin" />
                      <div className="absolute inset-4 flex items-center justify-center">
                        <Blocks className="h-8 w-8 text-primary" />
                      </div>
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Anchoring to {network.charAt(0).toUpperCase() + network.slice(1)}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      Waiting for blockchain confirmation...
                    </p>
                  </div>
                </Card>
              </motion.div>
            ) : result ? (
              <motion.div
                key="results"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="space-y-6"
              >
                {/* Success Card */}
                <Card className="overflow-hidden">
                  <div className="h-2 bg-gradient-to-r from-success to-primary" />
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <CheckCircle2 className="h-5 w-5 text-success" />
                        Anchored Successfully
                      </CardTitle>
                      <StatusBadge status="success">Confirmed</StatusBadge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-lg bg-muted/50 p-4">
                        <Label className="text-xs text-muted-foreground">Network</Label>
                        <p className="font-semibold mt-1 capitalize">{result.network}</p>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-4">
                        <Label className="text-xs text-muted-foreground">Block Number</Label>
                        <p className="font-mono font-semibold mt-1">#{result.blockNumber}</p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Transaction Hash</Label>
                      <div className="rounded-lg bg-sidebar text-sidebar-foreground p-3 font-mono text-sm break-all">
                        {result.transactionHash}
                      </div>
                    </div>

                    <Button asChild className="w-full" variant="outline">
                      <a
                        href={result.explorerUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        View on Block Explorer
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  </CardContent>
                </Card>

                {/* Verification Badge */}
                <Card className="bg-gradient-to-br from-success/10 to-primary/10 border-success/20">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-4">
                      <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-success to-primary flex items-center justify-center shadow-lg">
                        <Shield className="h-8 w-8 text-white" />
                      </div>
                      <div>
                        <h4 className="font-bold text-lg text-foreground">Verified on Chain</h4>
                        <p className="text-sm text-muted-foreground">
                          This evidence is now permanently anchored and can be independently verified.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                {/* Raw Data */}
                <Card>
                  <CardHeader>
                    <CardTitle>Anchor Data</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CodeBlock
                      code={JSON.stringify(result, null, 2)}
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
                <Card className="h-[400px] flex items-center justify-center">
                  <div className="text-center p-8">
                    <div className="mx-auto w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 flex items-center justify-center mb-4">
                      <Link2 className="h-8 w-8 text-indigo-500" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      Ready to Anchor
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Enter a bundle ID and select a blockchain network to create an immutable record.
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
