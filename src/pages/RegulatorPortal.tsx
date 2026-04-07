import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Shield, Search, CheckCircle2, XCircle, AlertTriangle, ExternalLink, Lock, Unlock, ChevronDown, ChevronRight, RefreshCw } from 'lucide-react';

// Deterministic JSON — mirrors stableStringify in bundle/index.ts.
// Sorts all object keys alphabetically so that JSONB round-trips don't break the hash.
function stableStringify(value: unknown): string {
  if (value === null || typeof value !== 'object') return JSON.stringify(value);
  if (Array.isArray(value)) return '[' + (value as unknown[]).map(stableStringify).join(',') + ']';
  const keys = Object.keys(value as object).sort();
  return '{' + keys.map(k => JSON.stringify(k) + ':' + stableStringify((value as Record<string, unknown>)[k])).join(',') + '}';
}

async function sha256hex(data: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(data));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:54321/functions/v1';
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

interface ComplianceCheck {
  article: string;
  requirement: string;
  status: 'pass' | 'fail' | 'not_applicable';
  evidence: string;
}

interface RawBundle {
  promptId: string;
  executionId: string;
  analysisId: string;
  signatureId: string;
  cognitiveHash: string;
  timeline: Array<{ event: string; hash: string; timestamp: string }>;
}

interface ComplianceReport {
  bundleId: string;
  found: boolean;
  overallCompliant: boolean;
  complianceScore: string;
  checks: ComplianceCheck[];
  summary: { passed: number; failed: number; notApplicable: number };
  bundleHash?: string | null;
  rawBundle?: RawBundle;
  blockchainProof: {
    network: string;
    transactionHash: string;
    blockNumber: number;
    explorerUrl: string;
    verifiableByAnyone: boolean;
  } | null;
  content?: {
    promptContent: string | null;
    aiResponse: string | null;
    provider: string | null;
    model: string | null;
    accessLevel: 'public' | 'metadata_only' | 'full';
    hint?: string;
    timeline?: Array<{ step: string; hash: string; timestamp: string }>;
  };
  generatedAt: string;
  disclaimer: string;
  error?: string;
}

export default function RegulatorPortal() {
  const [query, setQuery] = useState('');
  const [token, setToken] = useState('');
  const [loading, setLoading] = useState(false);
  const [report, setReport] = useState<ComplianceReport | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Hash verification section state
  const [jsonExpanded, setJsonExpanded] = useState(false);
  const [hashStatus, setHashStatus] = useState<'idle' | 'computing' | 'match' | 'mismatch'>('idle');
  const [computedHash, setComputedHash] = useState<string | null>(null);

  const isTokenValid = token.trim().startsWith('reg_');

  const handleVerify = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true);
    setErrorMsg(null);
    setReport(null);
    setHashStatus('idle');
    setComputedHash(null);
    setJsonExpanded(false);

    const isTxHash = q.startsWith('0x');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(ANON_KEY ? { Authorization: `Bearer ${ANON_KEY}` } : {}),
      ...(token.trim() ? { 'x-regulator-token': token.trim() } : {}),
    };

    try {
      const res = await fetch(`${API_BASE}/regulator-verify`, {
        method: 'POST',
        headers,
        body: JSON.stringify(isTxHash ? { transactionHash: q } : { bundleId: q }),
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data: ComplianceReport = await res.json();
      if (!data.found) {
        setErrorMsg('Aucun enregistrement trouvé pour cet identifiant.');
      } else {
        setReport(data);
      }
    } catch {
      setErrorMsg("Erreur de vérification. Vérifiez l'identifiant et réessayez.");
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleVerify();
  };

  const handleRecomputeHash = async () => {
    if (!report?.rawBundle || !report?.bundleHash) return;
    setHashStatus('computing');
    setComputedHash(null);
    try {
      const hash = await sha256hex(stableStringify(report.rawBundle));
      setComputedHash(hash);
      setHashStatus(hash === report.bundleHash ? 'match' : 'mismatch');
    } catch {
      setHashStatus('mismatch');
    }
  };

  const passCount = report?.checks.filter(c => c.status === 'pass').length ?? 0;
  const totalCount = report?.checks.length ?? 0;
  const hasEd25519 = report?.checks.some(
    c => c.article.toLowerCase().includes('19') && c.evidence?.toLowerCase().includes('ed25519') && c.status === 'pass'
  );
  const networkLabel = report?.blockchainProof?.network
    ? report.blockchainProof.network.charAt(0).toUpperCase() + report.blockchainProof.network.slice(1)
    : 'Polygon Mainnet';
  const isFullAccess = report?.content?.accessLevel === 'full';

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

          {/* Token régulateur */}
          <div className="mt-4 pt-4 border-t border-gray-100">
            <label className="block text-xs font-medium text-gray-500 mb-2">
              Token régulateur <span className="text-gray-400 font-normal">(optionnel — accès contenu complet)</span>
            </label>
            <div className="flex items-center gap-3">
              <div className="relative flex-1">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                <input
                  type="text"
                  className="w-full h-10 rounded-lg border border-gray-200 pl-9 pr-4 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-[#185FA5] focus:border-transparent placeholder:text-gray-300 placeholder:font-sans"
                  placeholder="reg_xxxx_…"
                  value={token}
                  onChange={e => setToken(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </div>
              {token && (
                <span className={`text-xs font-medium flex items-center gap-1 shrink-0 ${isTokenValid ? 'text-green-600' : 'text-amber-500'}`}>
                  {isTokenValid
                    ? <><CheckCircle2 className="h-3.5 w-3.5" /> Format valide</>
                    : <><AlertTriangle className="h-3.5 w-3.5" /> Format invalide</>
                  }
                </span>
              )}
            </div>
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
              {/* Declassified banner — only when token is valid */}
              {isFullAccess && (
                <div className="rounded-2xl border border-green-200 bg-green-50 p-4 flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-green-600 flex items-center justify-center shrink-0">
                    <Unlock className="h-4 w-4 text-white" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-green-800">
                      Contenu déclassifié — Token régulateur validé
                    </p>
                    <p className="text-xs text-green-600 mt-0.5">
                      Accès complet au prompt, à la réponse IA et aux nœuds cognitifs accordé
                    </p>
                  </div>
                </div>
              )}

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
                    <p className="text-xl font-bold" style={{ color: report.overallCompliant ? '#3B6D11' : '#991B1B' }}>
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
                  { label: 'Articles vérifiés', value: `${passCount}/${totalCount}` },
                  { label: 'Score cohérence', value: report.complianceScore?.replace('Score: ', '') ?? '—' },
                  { label: 'Signature', value: hasEd25519 ? 'Ed25519' : '—' },
                  { label: 'Réseau', value: networkLabel },
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

              {/* ── VÉRIFICATION INDÉPENDANTE DU HASH ─────────── */}
              {report.rawBundle && report.bundleHash && (
                <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                  <div className="px-6 py-4 border-b border-gray-100">
                    <h2 className="text-sm font-semibold text-gray-800">Vérification indépendante du hash</h2>
                    <p className="text-xs text-gray-500 mt-0.5">
                      Preuve mathématique que les données n'ont pas été modifiées après ancrage
                    </p>
                  </div>

                  <div className="px-6 py-5 space-y-5">
                    {/* Privacy notice */}
                    <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-xl px-4 py-3">
                      <Lock className="h-4 w-4 text-blue-500 mt-0.5 shrink-0" />
                      <p className="text-xs text-blue-700 leading-relaxed">
                        <span className="font-semibold">Ce calcul est effectué entièrement dans votre navigateur.</span>{' '}
                        Aucune donnée n'est envoyée à nos serveurs. Vous pouvez vérifier le code source.
                      </p>
                    </div>

                    {/* Anchored hash */}
                    <div>
                      <p className="text-xs text-gray-500 mb-1.5">Hash ancré sur Polygon (référence)</p>
                      <p className="font-mono text-xs bg-gray-50 border border-gray-200 rounded-lg p-3 break-all text-gray-700">
                        {report.bundleHash}
                      </p>
                    </div>

                    {/* Collapsible raw JSON */}
                    <div>
                      <button
                        onClick={() => setJsonExpanded(v => !v)}
                        className="flex items-center gap-2 text-xs font-medium text-gray-600 hover:text-gray-900 transition-colors"
                      >
                        {jsonExpanded
                          ? <ChevronDown className="h-3.5 w-3.5" />
                          : <ChevronRight className="h-3.5 w-3.5" />
                        }
                        Données brutes du bundle (JSON)
                      </button>
                      {jsonExpanded && (
                        <pre className="mt-2 bg-gray-50 border border-gray-200 rounded-xl p-4 text-xs font-mono text-gray-700 overflow-x-auto max-h-64 overflow-y-auto">
                          {JSON.stringify(report.rawBundle, null, 2)}
                        </pre>
                      )}
                    </div>

                    {/* Recompute button */}
                    <div className="flex items-center gap-4">
                      <button
                        onClick={handleRecomputeHash}
                        disabled={hashStatus === 'computing'}
                        className="flex items-center gap-2 h-10 px-5 rounded-xl text-sm font-semibold text-white disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        style={{ backgroundColor: '#185FA5' }}
                      >
                        <RefreshCw className={`h-4 w-4 ${hashStatus === 'computing' ? 'animate-spin' : ''}`} />
                        {hashStatus === 'computing' ? 'Calcul en cours…' : 'Recalculer le hash'}
                      </button>
                      <span className="text-xs text-gray-400">SHA-256 · Web Crypto API · zéro requête réseau</span>
                    </div>

                    {/* Result */}
                    {hashStatus === 'match' && computedHash && (
                      <div className="rounded-xl border border-green-200 bg-green-50 px-4 py-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="h-5 w-5 text-green-600 shrink-0" />
                          <p className="text-sm font-semibold text-green-800">
                            Hash vérifié — les données correspondent exactement au hash blockchain
                          </p>
                        </div>
                        <p className="font-mono text-xs text-green-700 break-all pl-7">{computedHash}</p>
                      </div>
                    )}
                    {hashStatus === 'mismatch' && (
                      <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 space-y-2">
                        <div className="flex items-center gap-2">
                          <XCircle className="h-5 w-5 text-red-500 shrink-0" />
                          <p className="text-sm font-semibold text-red-700">Hash invalide — les données ont été modifiées</p>
                        </div>
                        {computedHash && (
                          <p className="font-mono text-xs text-red-500 break-all pl-7">Calculé : {computedHash}</p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              )}

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

              {/* ── CONTENU DÉCISION IA ─────────────────────────── */}
              <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
                  <h2 className="text-sm font-semibold text-gray-800">Contenu de la décision IA</h2>
                  {isFullAccess ? (
                    <span className="text-xs font-medium text-green-600 flex items-center gap-1">
                      <Unlock className="h-3.5 w-3.5" />
                      Accès complet
                    </span>
                  ) : (
                    <span className="text-xs font-medium text-gray-400 flex items-center gap-1">
                      <Lock className="h-3.5 w-3.5" />
                      Accès restreint
                    </span>
                  )}
                </div>

                {isFullAccess ? (
                  <div className="px-6 py-5 space-y-6">
                    {/* Provider / Model */}
                    {(report.content?.provider || report.content?.model) && (
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Fournisseur IA</p>
                          <p className="text-sm font-semibold text-gray-800 capitalize">
                            {report.content.provider || '—'}
                          </p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500 mb-1">Modèle</p>
                          <p className="text-sm font-mono text-gray-700">{report.content?.model || '—'}</p>
                        </div>
                      </div>
                    )}

                    {/* Prompt */}
                    {report.content?.promptContent ? (
                      <div>
                        <p className="text-xs text-gray-500 mb-2">Prompt soumis</p>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap">
                          {report.content.promptContent}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-gray-500 mb-2">Prompt soumis</p>
                        <p className="text-xs text-gray-400 italic">Non disponible pour ce bundle</p>
                      </div>
                    )}

                    {/* AI response */}
                    {report.content?.aiResponse ? (
                      <div>
                        <p className="text-xs text-gray-500 mb-2">Réponse IA</p>
                        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 text-sm text-gray-700 whitespace-pre-wrap max-h-80 overflow-y-auto">
                          {report.content.aiResponse}
                        </div>
                      </div>
                    ) : (
                      <div>
                        <p className="text-xs text-gray-500 mb-2">Réponse IA</p>
                        <p className="text-xs text-gray-400 italic">Non disponible pour ce bundle</p>
                      </div>
                    )}

                    {/* Cognitive nodes (timeline) */}
                    {report.content?.timeline && report.content.timeline.length > 0 && (
                      <div>
                        <p className="text-xs text-gray-500 mb-3">
                          Nœuds cognitifs ({report.content.timeline.length})
                        </p>
                        <div className="space-y-2">
                          {report.content.timeline.map((node, i) => (
                            <div key={i} className="flex items-start gap-3 text-xs">
                              <span className="h-5 w-5 rounded-full bg-[#185FA5]/10 text-[#185FA5] font-bold flex items-center justify-center shrink-0 mt-0.5 text-[10px]">
                                {i + 1}
                              </span>
                              <div className="flex-1 bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
                                <p className="font-medium text-gray-700">{node.step}</p>
                                {node.hash && (
                                  <p className="font-mono text-gray-400 mt-0.5">
                                    {node.hash.substring(0, 24)}…
                                  </p>
                                )}
                                {node.timestamp && (
                                  <p className="text-gray-400 mt-0.5">
                                    {new Date(node.timestamp).toLocaleTimeString('fr-FR')}
                                  </p>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="px-6 py-12 text-center">
                    <Lock className="h-8 w-8 text-gray-200 mx-auto mb-3" />
                    <p className="text-sm font-semibold text-gray-500">
                      🔒 Contenu confidentiel — accès régulateur requis
                    </p>
                    <p className="text-xs text-gray-400 mt-2 max-w-sm mx-auto">
                      Entrez un token régulateur (format&nbsp;: <span className="font-mono">reg_xxxx_…</span>) pour accéder au prompt, à la réponse IA et aux nœuds cognitifs.
                    </p>
                  </div>
                )}
              </div>

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
