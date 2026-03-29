import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Search, CheckCircle2, XCircle, AlertTriangle, ExternalLink, FileDown, Scale, Building2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:54321/functions/v1';
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

interface ComplianceCheck {
  article: string;
  requirement: string;
  status: 'pass' | 'fail' | 'not_applicable';
  evidence: string;
}

interface ComplianceReport {
  bundleId: string;
  found: boolean;
  overallCompliant: boolean;
  complianceScore: string;
  checks: ComplianceCheck[];
  summary: { passed: number; failed: number; notApplicable: number };
  blockchainProof: {
    network: string;
    transactionHash: string;
    blockNumber: number;
    explorerUrl: string;
    verifiableByAnyone: boolean;
  } | null;
  timeline: Array<{ event: string; timestamp: string; hash: string }>;
  regulators: Array<{ name: string; jurisdiction: string; relevance: string }>;
  generatedAt: string;
  disclaimer: string;
  error?: string;
}

interface BulkResult {
  mode: string;
  total: number;
  passed: number;
  failed: number;
  reports: ComplianceReport[];
  generatedAt: string;
}

const REGULATOR_INFO = [
  {
    name: 'DGCCRF',
    role: 'National AI Act contact point',
    sector: 'General commerce & consumer products',
    icon: Building2,
    message: 'The DGCCRF is the primary enforcement authority for AI Act compliance in France.',
  },
  {
    name: 'CNIL',
    role: 'Data protection & biometric AI',
    sector: 'Personal data, recruitment, education, justice',
    icon: Shield,
    message: 'The CNIL supervises AI systems processing personal data under both GDPR and AI Act.',
  },
  {
    name: 'ACPR',
    role: 'Financial AI systems',
    sector: 'Credit scoring, insurance, banking',
    icon: Scale,
    message: 'The ACPR controls high-risk AI systems in financial services (Annex III).',
  },
];

export default function RegulatorPortal() {
  const [bundleId, setBundleId] = useState('');
  const [txHash, setTxHash] = useState('');
  const [bulkIds, setBulkIds] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [bulkResult, setBulkResult] = useState<BulkResult | null>(null);

  const callRegulatorAPI = async (body: Record<string, unknown>) => {
    const res = await fetch(`${API_BASE}/regulator-verify`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(ANON_KEY ? { 'Authorization': `Bearer ${ANON_KEY}` } : {}),
      },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new Error(`API error ${res.status}`);
    return res.json();
  };

  const handleSingleVerify = async () => {
    if (!bundleId && !txHash) {
      toast.error('Enter a bundle ID or transaction hash');
      return;
    }
    setLoading(true);
    setBulkResult(null);
    try {
      const result = await callRegulatorAPI({
        bundleId: bundleId || undefined,
        transactionHash: txHash || undefined,
      });
      setReport(result);
      if (result.overallCompliant) {
        toast.success('Compliance verified');
      } else if (!result.found) {
        toast.error('Bundle not found');
      } else {
        toast.error('Compliance issues detected');
      }
    } catch (err) {
      toast.error('Verification failed');
    } finally {
      setLoading(false);
    }
  };

  const handleBulkVerify = async () => {
    const ids = bulkIds.split('\n').map(s => s.trim()).filter(Boolean);
    if (ids.length === 0) {
      toast.error('Enter at least one bundle ID');
      return;
    }
    setLoading(true);
    setReport(null);
    try {
      const result = await callRegulatorAPI({ bundleIds: ids });
      setBulkResult(result);
      toast.success(`${result.passed}/${result.total} bundles compliant`);
    } catch (err) {
      toast.error('Bulk verification failed');
    } finally {
      setLoading(false);
    }
  };

  const statusIcon = (status: string) => {
    if (status === 'pass') return <CheckCircle2 className="h-5 w-5 text-green-500" />;
    if (status === 'fail') return <XCircle className="h-5 w-5 text-red-500" />;
    return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header — no sidebar, standalone portal */}
      <header className="border-b bg-card/50 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <div>
              <h1 className="font-bold text-lg">ProofAI — Regulator Portal</h1>
              <p className="text-xs text-muted-foreground">Independent AI compliance verification</p>
            </div>
          </div>
          <p className="text-xs text-muted-foreground hidden md:block">
            No account required. No login. Just math.
          </p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8 space-y-8">
        {/* Regulator info cards */}
        <div className="grid gap-4 md:grid-cols-3">
          {REGULATOR_INFO.map((reg) => {
            const Icon = reg.icon;
            return (
              <motion.div key={reg.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
                <Card className="h-full">
                  <CardContent className="pt-6">
                    <div className="flex items-center gap-3 mb-2">
                      <Icon className="h-5 w-5 text-primary" />
                      <span className="font-bold">{reg.name}</span>
                    </div>
                    <p className="text-xs text-muted-foreground mb-1">{reg.role}</p>
                    <p className="text-xs text-muted-foreground">{reg.sector}</p>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Verification tabs */}
        <Tabs defaultValue="single">
          <TabsList className="grid w-full grid-cols-2 max-w-md">
            <TabsTrigger value="single">Single Verification</TabsTrigger>
            <TabsTrigger value="bulk">Bulk Audit</TabsTrigger>
          </TabsList>

          <TabsContent value="single" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Search className="h-5 w-5 text-primary" />
                  Verify AI Evidence Bundle
                </CardTitle>
                <CardDescription>
                  Enter a bundle ID or Polygon transaction hash to verify compliance
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>Bundle ID</Label>
                  <Input
                    placeholder="bnd_8019b37a7f44_..."
                    value={bundleId}
                    onChange={(e) => setBundleId(e.target.value)}
                    className="font-mono"
                  />
                </div>
                <div className="text-center text-xs text-muted-foreground">or</div>
                <div className="space-y-2">
                  <Label>Polygon Transaction Hash</Label>
                  <Input
                    placeholder="0xbbf92ceb6354a066..."
                    value={txHash}
                    onChange={(e) => setTxHash(e.target.value)}
                    className="font-mono"
                  />
                </div>
                <Button onClick={handleSingleVerify} className="w-full" disabled={loading}>
                  <Search className="mr-2 h-4 w-4" />
                  {loading ? 'Verifying...' : 'Verify Compliance'}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="bulk" className="space-y-4 mt-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Scale className="h-5 w-5 text-primary" />
                  Bulk Compliance Audit
                </CardTitle>
                <CardDescription>
                  Paste multiple bundle IDs (one per line) to audit an organization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Textarea
                  placeholder="bnd_xxx_111&#10;bnd_xxx_222&#10;bnd_xxx_333"
                  value={bulkIds}
                  onChange={(e) => setBulkIds(e.target.value)}
                  className="font-mono min-h-[150px]"
                />
                <Button onClick={handleBulkVerify} className="w-full" disabled={loading}>
                  <Scale className="mr-2 h-4 w-4" />
                  {loading ? 'Auditing...' : `Audit ${bulkIds.split('\n').filter(Boolean).length || 0} bundles`}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Single report */}
        <AnimatePresence>
          {report && report.found && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-6"
            >
              {/* Overall status */}
              <Card className={`overflow-hidden ${report.overallCompliant ? 'border-green-500/50' : 'border-red-500/50'}`}>
                <div className={`h-2 ${report.overallCompliant ? 'bg-gradient-to-r from-green-500 to-primary' : 'bg-red-500'}`} />
                <CardContent className="pt-6">
                  <div className="flex items-center gap-4">
                    <div className={`h-16 w-16 rounded-2xl flex items-center justify-center ${report.overallCompliant ? 'bg-green-500' : 'bg-red-500'}`}>
                      {report.overallCompliant
                        ? <CheckCircle2 className="h-8 w-8 text-white" />
                        : <XCircle className="h-8 w-8 text-white" />
                      }
                    </div>
                    <div>
                      <h2 className="text-xl font-bold">
                        {report.overallCompliant ? 'Compliant' : 'Non-Compliant'}
                      </h2>
                      <p className="text-sm text-muted-foreground">{report.complianceScore}</p>
                      <p className="text-xs text-muted-foreground">Bundle: {report.bundleId}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Compliance checks */}
              <Card>
                <CardHeader>
                  <CardTitle>EU AI Act Compliance Checks</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {report.checks.map((check, i) => (
                      <div key={i} className={`flex items-start gap-3 p-3 rounded-lg border ${
                        check.status === 'pass' ? 'bg-green-500/5 border-green-500/20' :
                        check.status === 'fail' ? 'bg-red-500/5 border-red-500/20' :
                        'bg-yellow-500/5 border-yellow-500/20'
                      }`}>
                        {statusIcon(check.status)}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs bg-muted px-2 py-0.5 rounded">{check.article}</span>
                            <span className="text-sm font-medium">{check.requirement}</span>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{check.evidence}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Blockchain proof */}
              {report.blockchainProof && (
                <Card>
                  <CardHeader>
                    <CardTitle>Blockchain Verification</CardTitle>
                    <CardDescription>
                      This proof can be independently verified on Polygonscan — no account required
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div className="grid gap-3 md:grid-cols-2">
                      <div className="bg-muted/50 rounded-lg p-3">
                        <Label className="text-xs text-muted-foreground">Network</Label>
                        <p className="font-semibold capitalize">{report.blockchainProof.network}</p>
                      </div>
                      <div className="bg-muted/50 rounded-lg p-3">
                        <Label className="text-xs text-muted-foreground">Block</Label>
                        <p className="font-mono font-semibold">#{report.blockchainProof.blockNumber}</p>
                      </div>
                    </div>
                    <div className="bg-sidebar text-sidebar-foreground rounded-lg p-3 font-mono text-sm break-all">
                      {report.blockchainProof.transactionHash}
                    </div>
                    <Button variant="outline" className="w-full" asChild>
                      <a href={report.blockchainProof.explorerUrl} target="_blank" rel="noopener noreferrer">
                        Verify on Polygonscan
                        <ExternalLink className="ml-2 h-4 w-4" />
                      </a>
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* Disclaimer */}
              <p className="text-xs text-muted-foreground text-center">{report.disclaimer}</p>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Bulk results */}
        {bulkResult && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
            <Card>
              <CardHeader>
                <CardTitle>Bulk Audit Results</CardTitle>
                <CardDescription>
                  {bulkResult.passed}/{bulkResult.total} bundles compliant
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {bulkResult.reports.map((r, i) => (
                    <div key={i} className={`flex items-center gap-3 p-3 rounded-lg border ${r.overallCompliant ? 'border-green-500/20' : 'border-red-500/20'}`}>
                      {r.overallCompliant
                        ? <CheckCircle2 className="h-5 w-5 text-green-500" />
                        : <XCircle className="h-5 w-5 text-red-500" />
                      }
                      <code className="text-xs flex-1">{r.bundleId}</code>
                      <span className="text-xs text-muted-foreground">{r.complianceScore}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}

        {/* Footer */}
        <div className="text-center pt-8 pb-12 border-t">
          <p className="text-sm text-muted-foreground mb-2">
            ProofAI — Cryptographic proof that AI thought before it answered
          </p>
          <p className="text-xs text-muted-foreground">
            Open source (MIT) — <a href="https://github.com/proof-ai/proofai" className="underline">github.com/proof-ai/proofai</a>
          </p>
        </div>
      </main>
    </div>
  );
}
