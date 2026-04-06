import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Search, CheckCircle2, XCircle, AlertTriangle, ExternalLink } from 'lucide-react';

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
  generatedAt: string;
  disclaimer: string;
  error?: string;
}

export default function RegulatorPortal() {
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleVerify = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setErrorMsg(null);
    setReport(null);

    const isTxHash = q.startsWith('0x');
    try {
      const res = await fetch(`${API_BASE}/regulator-verify`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(ANON_KEY ? { Authorization: `Bearer ${ANON_KEY}` } : {}),
        },
        body: JSON.stringify(
          isTxHash ? { transactionHash: q } : { bundleId: q }
        ),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ComplianceReport = await res.json();
      if (!data.found) {
        setErrorMsg('Aucun enregistrement trouvé pour cet identifiant.');
      } else {
        setReport(data);
      }
    } catch {
      setErrorMsg('Erreur de vérification. Vérifiez l\'identifiant et réessayez.');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleVerify();
  };

  const passCount = report?.checks.filter(c => c.status === 'pass').length ?? 0;
  const totalCount = report?.checks.length ?? 0;
  const hasEd25519 = report?.checks.some(c =>
    c.article.toLowerCase().includes('19') && c.evidence?.toLowerCase().includes('ed25519') && c.status === 'pass'
  );
  const networkLabel = report?.blockchainProof?.network
    ? report.blockchainProof.network.charAt(0).toUpperCase() + report.blockchainProof.network.slice(1)
    : 'Polygon Mainnet';

  return (
    <div className="min-h-screen bg-[#F8FAFB]">
      {/* ── HEADER ─────────────────────────────────────────── */}
      <header className="bg-white border-b border-gray-200">
        <div className="max-w-3xl mx-auto px-6 py-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-3">
            <div className="h-10 w-10 rounded-xl bg-[#185FA5] flex items-center justify-center shrink-0">
              <Shield className="h-5 w-5 text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-900">Portail Régulateur</h1>
          </div>
          <p className="text-sm text-gray-500 mb-4">
            Vérification indépendante des preuves IA — EU AI Act Article 12 &amp; 19
          </p>
          <span className="inline-flex items-center gap-1.5 bg-[#185FA5] text-white text-xs font-medium px-3 py-1.5 rounded-full">
            <span className="h-1.5 w-1.5 rounded-full bg-white/70" />
            Accès public · Sans compte · Sans intermédiaire
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10 space-y-8">
        {/* ── REGULATOR DIRECTORY ────────────────────────────── */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-gray-400">
          <span className="shrink-0">Portail accessible à :</span>
          {['CNIL', 'ACPR', 'ARCOM', 'DGCCRF', 'PEReN', 'DGE'].map(name => (
            <span key={name} className="bg-gray-100 text-gray-600 px-2.5 py-1 rounded-full font-medium">
              {name}
            </span>
          ))}
        </div>

        {/* ── SEARCH BOX ─────────────────────────────────────── */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6">
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Bundle ID ou Hash de transaction Polygon
          </label>
          <div className="flex gap-3">
            <input
              type="text"
              className="flex-1 h-12 rounded-xl border border-gray-300 px-4 font-mono text-sm focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent placeholder:text-gray-400 placeholder:font-sans"
              placeholder="bnd_8019b37a7f44_… ou 0xbbf92ceb6354…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button
              onClick={handleVerify}
              disabled={loading || !query.trim()}
              className="h-12 px-6 rounded-xl text-white text-sm font-semibold flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              style={{ backgroundColor: '#185FA5' }}
            >
              <Search className="h-4 w-4" />
              {loading ? 'Vérification…' : 'Vérifier'}
            </button>
          </div>
        </div>

        {/* ── ERROR STATE ─────────────────────────────────────── */}
        {errorMsg && (
          <div className="bg-red-50 border border-red-200 rounded-2xl p-5 flex items-center gap-3 text-red-700 text-sm">
            <XCircle className="h-5 w-5 shrink-0" />
            {errorMsg}
          </div>
        )}

        {/* ── RESULT ─────────────────────────────────────────── */}
        <AnimatePresence>
          {report && (
            <motion.div
              key="result"
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 16 }}
              transition={{ duration: 0.25 }}
              className="space-y-5"
            >
              {/* Verdict card */}
              <div
                className="rounded-2xl border p-6"
                style={{
                  background: report.overallCompliant ? '#EAF3DE' : '#FEF2F2',
                  borderColor: report.overallCompliant ? '#B6D48E' : '#FECACA',
                }}
              >
                <div className="flex items-start gap-4">
                  <div
                    className="h-14 w-14 rounded-2xl flex items-center justify-center shrink-0"
                    style={{ background: report.overallCompliant ? '#3B6D11' : '#DC2626' }}
                  >
                    {report.overallCompliant
                      ? <CheckCircle2 className="h-7 w-7 text-white" />
                      : <XCircle className="h-7 w-7 text-white" />
                    }
                  </div>
                  <div>
                    <p
                      className="text-xl font-bold"
                      style={{ color: report.overallCompliant ? '#3B6D11' : '#991B1B' }}
                    >
                      {report.overallCompliant ? 'Conformité vérifiée' : 'Non conforme'}
                    </p>
                    <p className="text-sm mt-0.5" style={{ color: report.overallCompliant ? '#4A7F1E' : '#B91C1C' }}>
                      Bundle : <span className="font-mono">{report.bundleId}</span>
                    </p>
                    <p className="text-xs mt-1" style={{ color: report.overallCompliant ? '#5A8F28' : '#DC2626' }}>
                      Vérifié le {new Date(report.generatedAt).toLocaleString('fr-FR', {
                        dateStyle: 'long',
                        timeStyle: 'short',
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* 4 metric cards */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                  {
                    label: 'Articles vérifiés',
                    value: `${passCount}/${totalCount}`,
                  },
                  {
                    label: 'Score cohérence',
                    value: report.complianceScore?.replace('Score: ', '') ?? '—',
                  },
                  {
                    label: 'Signature',
                    value: hasEd25519 ? 'Ed25519' : '—',
                  },
                  {
                    label: 'Réseau',
                    value: networkLabel,
                  },
                ].map(card => (
                  <div key={card.label} className="bg-white rounded-xl border border-gray-200 p-4 text-center shadow-sm">
                    <p className="text-xs text-gray-500 mb-1">{card.label}</p>
                    <p className="text-lg font-bold text-gray-900">{card.value}</p>
                  </div>
                ))}
              </div>

              {/* Article-by-article checks */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100">
                  <h2 className="text-sm font-semibold text-gray-800">Vérifications article par article</h2>
                </div>
                <ul className="divide-y divide-gray-100">
                  {report.checks.map((check, i) => (
                    <li key={i} className="flex items-start gap-4 px-6 py-4">
                      <div className="mt-0.5 shrink-0">
                        {check.status === 'pass'
                          ? <CheckCircle2 className="h-5 w-5 text-[#3B6D11]" />
                          : check.status === 'fail'
                          ? <XCircle className="h-5 w-5 text-red-500" />
                          : <AlertTriangle className="h-5 w-5 text-amber-500" />
                        }
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-0.5">
                          <span className="font-mono text-xs bg-gray-100 text-gray-700 px-2 py-0.5 rounded">
                            {check.article}
                          </span>
                          <span className="text-sm font-medium text-gray-800">{check.requirement}</span>
                        </div>
                        <p className="text-xs text-gray-500">{check.evidence}</p>
                      </div>
                      <span
                        className="shrink-0 text-xs font-semibold px-2.5 py-1 rounded-full"
                        style={
                          check.status === 'pass'
                            ? { background: '#EAF3DE', color: '#3B6D11' }
                            : check.status === 'fail'
                            ? { background: '#FEF2F2', color: '#991B1B' }
                            : { background: '#FFFBEB', color: '#92400E' }
                        }
                      >
                        {check.status === 'pass' ? 'Conforme' : check.status === 'fail' ? 'Non conforme' : 'N/A'}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Blockchain record */}
              {report.blockchainProof && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-sm font-semibold text-gray-800">Enregistrement blockchain</h2>
                  </div>
                  <div className="px-6 py-5 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Réseau</p>
                        <p className="text-sm font-semibold text-gray-800 capitalize">
                          {report.blockchainProof.network}
                        </p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 mb-1">Statut</p>
                        <span className="inline-flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full"
                          style={{ background: '#EAF3DE', color: '#3B6D11' }}>
                          <span className="h-1.5 w-1.5 rounded-full bg-[#3B6D11]" />
                          Ancré
                        </span>
                      </div>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1">Hash de transaction</p>
                      <p className="font-mono text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 break-all text-gray-700">
                        {report.blockchainProof.transactionHash}
                      </p>
                    </div>
                    <a
                      href={report.blockchainProof.explorerUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center justify-center gap-2 w-full h-11 rounded-xl border border-[#185FA5] text-[#185FA5] text-sm font-semibold hover:bg-[#185FA5]/5 transition-colors"
                    >
                      Vérifier sur Polygonscan
                      <ExternalLink className="h-4 w-4" />
                    </a>
                  </div>
                </div>
              )}

              {/* Disclaimer */}
              <p className="text-xs text-gray-400 text-center pb-2">{report.disclaimer}</p>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* ── FOOTER ─────────────────────────────────────────── */}
      <footer className="border-t border-gray-200 bg-white mt-16">
        <div className="max-w-3xl mx-auto px-6 py-6 text-center">
          <p className="text-xs text-gray-400">
            ProofAI — Preuve cryptographique que l'IA a réfléchi avant de répondre
          </p>
        </div>
      </footer>
    </div>
  );
}
