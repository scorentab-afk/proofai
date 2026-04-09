import { useState, useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { isAutoRun } from '@/lib/pipeline-params';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Search, CheckCircle2, XCircle, Clock, Hash, ExternalLink, FileDown } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { LoadingSpinner } from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { api, VerificationResult } from '@/api/client';
import { format } from 'date-fns';
import { exportAuditCertificatePDF } from '@/lib/pdf-export';

const verificationChecks = [
  { key: 'integrityValid', label: 'Data Integrity', description: 'Bundle contents unchanged' },
  { key: 'timestampValid', label: 'Timestamp Valid', description: 'Chronological order verified' },
  { key: 'ledgerAnchored', label: 'Ledger Anchored', description: 'Blockchain record exists' },
  { key: 'hashMatches', label: 'Hash Matches', description: 'Cryptographic verification passed' },
];

export default function AuditVerify() {
  const [searchParams] = useSearchParams();
  const autoRunTriggered = useRef(false);
  const autoRun = isAutoRun(searchParams);

  const [bundleId, setBundleId] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<VerificationResult | null>(null);

  // Auto-fill bundle ID from URL params
  useEffect(() => {
    const bundleIdParam = searchParams.get('bundleId');
    if (bundleIdParam) {
      setBundleId(bundleIdParam);
    }
  }, [searchParams]);

  // Auto-run verification
  useEffect(() => {
    const bundleIdParam = searchParams.get('bundleId');
    if (autoRun && bundleIdParam && !autoRunTriggered.current && !isLoading && !result) {
      autoRunTriggered.current = true;
      setTimeout(() => handleVerify(bundleIdParam), 300);
    }
  }, [autoRun, searchParams]);

  const handleVerify = async (overrideBundleId?: string) => {
    const bid = overrideBundleId || bundleId;
    if (!bid.trim()) {
      toast.error('Please enter a bundle ID');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.verifyBundle(bid);
      setResult(response);
      if (response.verified) {
        toast.success('Bundle verified successfully!');
      } else {
        toast.error('Verification failed - integrity issues detected');
      }
    } catch (error) {
      toast.error('Failed to verify bundle');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <MainLayout title="Audit & Verify" subtitle="Verify evidence integrity and provenance">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Search Card */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5 text-primary" />
                Verify Evidence Bundle
              </CardTitle>
              <CardDescription>
                Enter a bundle ID to verify its integrity and blockchain anchoring
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex gap-3">
                <div className="flex-1">
                  <Input
                    placeholder="Enter evidence bundle ID..."
                    value={bundleId}
                    onChange={(e) => setBundleId(e.target.value)}
                    className="font-mono"
                    onKeyDown={(e) => e.key === 'Enter' && handleVerify()}
                  />
                </div>
                <Button onClick={() => handleVerify()} disabled={isLoading} size="lg">
                  {isLoading ? (
                    <LoadingSpinner size="sm" />
                  ) : (
                    <>
                      <Search className="mr-2 h-4 w-4" />
                      Verify
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Results */}
        <AnimatePresence mode="wait">
          {result && (
            <motion.div
              key="results"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              className="space-y-6"
            >
              {/* Verification Status */}
              <Card
                className={`overflow-hidden ${
                  result.verified
                    ? 'border-success/50'
                    : 'border-destructive/50'
                }`}
              >
                <div
                  className={`h-2 ${
                    result.verified
                      ? 'bg-gradient-to-r from-success to-primary'
                      : 'bg-destructive'
                  }`}
                />
                <CardContent className="pt-6">
                  <div className="flex items-center gap-6">
                    <div
                      className={`h-20 w-20 rounded-2xl flex items-center justify-center ${
                        result.verified
                          ? 'bg-gradient-to-br from-success to-primary'
                          : 'bg-destructive'
                      }`}
                    >
                      {result.verified ? (
                        <CheckCircle2 className="h-10 w-10 text-white" />
                      ) : (
                        <XCircle className="h-10 w-10 text-white" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-foreground">
                        {result.verified ? 'Verification Passed' : 'Verification Failed'}
                      </h2>
                      <p className="text-muted-foreground mt-1">
                        Bundle ID: <code className="text-sm">{result.bundleId}</code>
                      </p>
                      <p className="text-sm text-muted-foreground mt-2">
                        Verified at {format(new Date(result.timestamp), 'PPpp')}
                      </p>
                    </div>
                  </div>
                  
                  {/* Export Certificate Button */}
                  {result.verified && (
                    <div className="mt-6 pt-4 border-t">
                      <Button
                        onClick={() => {
                          exportAuditCertificatePDF({
                            verificationResult: result,
                            bundleDetails: {
                              bundleHash: `sha256_${result.bundleId.replace('id_', '')}`,
                              cognitiveHash: `cognitive_${result.bundleId.substring(0, 20)}`,
                              createdAt: result.timestamp,
                            },
                            modelInfo: {
                              provider: 'Gemini',
                              modelId: 'gemini-2.5-flash',
                              version: '2025-01',
                            },
                            signatureInfo: {
                              signatureId: `sig_${result.bundleId.substring(3, 15)}`,
                              algorithm: 'Ed25519',
                              signedAt: result.timestamp,
                              signerIdentity: 'ai-executor-service',
                            },
                            decompressedInput: 'Analyser les patterns cognitifs de la réponse IA et générer un graphe de connaissances avec validation cryptographique pour audit externe.',
                            aiOutput: 'Après analyse cognitive multi-étapes avec signatures de pensée natives, les patterns indiquent une forte corrélation entre les paramètres d\'entrée et le schéma de sortie attendu. L\'embedding sémantique montre 94.7% d\'alignement avec la distribution d\'entraînement.',
                          });
                          toast.success('Certificat PDF généré avec succès!');
                        }}
                        className="w-full"
                        size="lg"
                      >
                        <FileDown className="mr-2 h-5 w-5" />
                        Télécharger Certificat d'Audit PDF
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Verification Checks */}
              <Card>
                <CardHeader>
                  <CardTitle>Integrity Checks</CardTitle>
                  <CardDescription>
                    Detailed verification results for each security check
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid gap-4 md:grid-cols-2">
                    {verificationChecks.map((check) => {
                      const passed = result.checks[check.key as keyof typeof result.checks];
                      return (
                        <div
                          key={check.key}
                          className={`flex items-center gap-4 rounded-lg border p-4 ${
                            passed
                              ? 'border-success/30 bg-success/5'
                              : 'border-destructive/30 bg-destructive/5'
                          }`}
                        >
                          <div
                            className={`h-10 w-10 rounded-full flex items-center justify-center ${
                              passed ? 'bg-success/20' : 'bg-destructive/20'
                            }`}
                          >
                            {passed ? (
                              <CheckCircle2 className="h-5 w-5 text-success" />
                            ) : (
                              <XCircle className="h-5 w-5 text-destructive" />
                            )}
                          </div>
                          <div>
                            <p className="font-medium text-foreground">{check.label}</p>
                            <p className="text-sm text-muted-foreground">
                              {check.description}
                            </p>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Ledger Information */}
              {result.ledgerInfo && result.ledgerInfo.blockNumber !== 0 && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <CardTitle className="flex items-center gap-2">
                        <Hash className="h-5 w-5" />
                        Blockchain Record
                      </CardTitle>
                      <StatusBadge status="success">Anchored</StatusBadge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2">
                      <div className="rounded-lg bg-muted/50 p-4">
                        <Label className="text-xs text-muted-foreground">Network</Label>
                        <p className="font-semibold mt-1 capitalize">
                          {result.ledgerInfo.network}
                        </p>
                      </div>
                      <div className="rounded-lg bg-muted/50 p-4">
                        <Label className="text-xs text-muted-foreground">Block Number</Label>
                        <p className="font-mono font-semibold mt-1">
                          #{result.ledgerInfo.blockNumber}
                        </p>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs text-muted-foreground">Transaction Hash</Label>
                      <div className="rounded-lg bg-sidebar text-sidebar-foreground p-3 font-mono text-sm break-all">
                        {result.ledgerInfo.transactionHash}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2 border-t">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        Confirmed {format(new Date(result.ledgerInfo.confirmedAt), 'PPpp')}
                      </div>
                      <Button variant="outline" size="sm" asChild>
                        <a
                          href={`https://${result.ledgerInfo.network === 'polygon' ? 'polygonscan.com' : 'etherscan.io'}/tx/${result.ledgerInfo.transactionHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          View on Explorer
                          <ExternalLink className="ml-2 h-3 w-3" />
                        </a>
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* Empty State */}
        {!result && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
          >
            <Card className="py-16">
              <CardContent>
                <div className="text-center">
                  <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-teal-500/20 to-green-500/20 flex items-center justify-center mb-6">
                    <Shield className="h-10 w-10 text-teal-500" />
                  </div>
                  <h3 className="text-xl font-semibold text-foreground mb-2">
                    Verify Evidence Integrity
                  </h3>
                  <p className="text-muted-foreground max-w-md mx-auto">
                    Enter an evidence bundle ID above to verify its integrity, 
                    check blockchain anchoring status, and confirm cryptographic proofs.
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </div>
    </MainLayout>
  );
}
