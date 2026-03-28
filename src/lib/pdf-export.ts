/**
 * PDF Export Utility for Cognitive Trace and Audit Certificates
 * Generates audit-ready PDF documents with signature and trace data
 */

import { jsPDF } from 'jspdf';
import type { SignatureResponse, VerificationResult } from '@/api/client';

interface ExportOptions {
  includeRawPayload?: boolean;
  includeChainHash?: string;
}

interface AuditCertificateData {
  verificationResult: VerificationResult;
  bundleDetails?: {
    promptId?: string;
    executionId?: string;
    analysisId?: string;
    signatureId?: string;
    cognitiveHash?: string;
    bundleHash?: string;
    createdAt?: string;
  };
  decompressedInput?: string;
  aiOutput?: string;
  modelInfo?: {
    provider?: string;
    modelId?: string;
    version?: string;
  };
  signatureInfo?: {
    signatureId?: string;
    algorithm?: string;
    signedAt?: string;
    signerIdentity?: string;
  };
}

/**
 * Export audit certificate as PDF for human review
 */
export async function exportAuditCertificatePDF(
  data: AuditCertificateData
): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPos = 20;

  const addLine = (height = 5) => {
    yPos += height;
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
  };

  const addText = (text: string, fontSize = 10, isBold = false) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    const lines = doc.splitTextToSize(text, contentWidth);
    doc.text(lines, margin, yPos);
    addLine(lines.length * (fontSize * 0.4) + 2);
  };

  const addSection = (title: string) => {
    addLine(5);
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos - 4, contentWidth, 8, 'F');
    addText(title, 12, true);
    addLine(2);
  };

  const addKeyValue = (key: string, value: string) => {
    doc.setFontSize(9);
    doc.setFont('helvetica', 'bold');
    doc.text(key, margin, yPos);
    doc.setFont('helvetica', 'normal');
    const valueLines = doc.splitTextToSize(value, contentWidth - 50);
    doc.text(valueLines, margin + 50, yPos);
    addLine(valueLines.length * 4 + 2);
  };

  // Header with verification status
  const isVerified = data.verificationResult.verified;
  doc.setFillColor(isVerified ? 34 : 220, isVerified ? 197 : 38, isVerified ? 94 : 38);
  doc.rect(0, 0, pageWidth, 40, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(20);
  doc.setFont('helvetica', 'bold');
  doc.text('CERTIFICAT D\'AUDIT AI', margin, 18);
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.text(isVerified ? '✓ VÉRIFIÉ ET AUTHENTIQUE' : '✗ ÉCHEC DE VÉRIFICATION', margin, 28);
  doc.setFontSize(9);
  doc.text(`Généré le: ${new Date().toLocaleString('fr-FR')}`, margin, 36);
  
  doc.setTextColor(0, 0, 0);
  yPos = 50;

  // Certificate ID and Status
  addSection('IDENTITÉ DU BUNDLE');
  addKeyValue('Bundle ID:', data.verificationResult.bundleId);
  addKeyValue('Statut:', isVerified ? 'Vérifié avec succès' : 'Échec de vérification');
  addKeyValue('Date vérification:', new Date(data.verificationResult.timestamp).toLocaleString('fr-FR'));
  
  if (data.bundleDetails) {
    if (data.bundleDetails.promptId) addKeyValue('Prompt ID:', data.bundleDetails.promptId);
    if (data.bundleDetails.executionId) addKeyValue('Execution ID:', data.bundleDetails.executionId);
    if (data.bundleDetails.analysisId) addKeyValue('Analysis ID:', data.bundleDetails.analysisId);
    if (data.bundleDetails.signatureId) addKeyValue('Signature ID:', data.bundleDetails.signatureId);
    if (data.bundleDetails.createdAt) addKeyValue('Créé le:', new Date(data.bundleDetails.createdAt).toLocaleString('fr-FR'));
  }

  // Integrity Checks
  addSection('CONTRÔLES D\'INTÉGRITÉ');
  const checks = data.verificationResult.checks;
  const checkLabels = {
    integrityValid: 'Intégrité des données',
    timestampValid: 'Horodatage valide',
    ledgerAnchored: 'Ancrage blockchain',
    hashMatches: 'Hash cryptographique',
  };
  
  Object.entries(checks).forEach(([key, passed]) => {
    const label = checkLabels[key as keyof typeof checkLabels];
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(passed ? 34 : 220, passed ? 197 : 38, passed ? 94 : 38);
    doc.text(passed ? '✓' : '✗', margin, yPos);
    doc.setTextColor(0, 0, 0);
    doc.text(`${label}: ${passed ? 'PASSÉ' : 'ÉCHOUÉ'}`, margin + 8, yPos);
    addLine(6);
  });

  // Blockchain Anchoring
  if (data.verificationResult.ledgerInfo) {
    addSection('ANCRAGE BLOCKCHAIN');
    addKeyValue('Réseau:', data.verificationResult.ledgerInfo.network.toUpperCase());
    addKeyValue('N° de bloc:', `#${data.verificationResult.ledgerInfo.blockNumber}`);
    addKeyValue('Transaction:', data.verificationResult.ledgerInfo.transactionHash);
    addKeyValue('Confirmé le:', new Date(data.verificationResult.ledgerInfo.confirmedAt).toLocaleString('fr-FR'));
  }

  // Cryptographic Hashes
  if (data.bundleDetails?.bundleHash || data.bundleDetails?.cognitiveHash) {
    addSection('PREUVES CRYPTOGRAPHIQUES');
    if (data.bundleDetails.bundleHash) {
      addText('Bundle Hash (SHA-256):', 10, true);
      doc.setFont('courier', 'normal');
      doc.setFontSize(8);
      doc.text(data.bundleDetails.bundleHash, margin, yPos);
      addLine(6);
    }
    if (data.bundleDetails.cognitiveHash) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      addText('Cognitive Hash:', 10, true);
      doc.setFont('courier', 'normal');
      doc.setFontSize(8);
      doc.text(data.bundleDetails.cognitiveHash, margin, yPos);
      addLine(6);
    }
  }

  // AI Model Information
  if (data.modelInfo) {
    addSection('INFORMATIONS MODÈLE IA');
    if (data.modelInfo.provider) addKeyValue('Fournisseur:', data.modelInfo.provider);
    if (data.modelInfo.modelId) addKeyValue('Modèle:', data.modelInfo.modelId);
    if (data.modelInfo.version) addKeyValue('Version:', data.modelInfo.version);
  }

  // Signature Information
  if (data.signatureInfo) {
    addSection('SIGNATURE NUMÉRIQUE');
    if (data.signatureInfo.signatureId) addKeyValue('ID Signature:', data.signatureInfo.signatureId);
    if (data.signatureInfo.algorithm) addKeyValue('Algorithme:', data.signatureInfo.algorithm);
    if (data.signatureInfo.signedAt) addKeyValue('Signé le:', new Date(data.signatureInfo.signedAt).toLocaleString('fr-FR'));
    if (data.signatureInfo.signerIdentity) addKeyValue('Signataire:', data.signatureInfo.signerIdentity);
  }

  // Decompressed Input
  if (data.decompressedInput) {
    addSection('ENTRÉE DÉCOMPRESSÉE (PROMPT)');
    doc.setFont('courier', 'normal');
    doc.setFontSize(9);
    const inputLines = doc.splitTextToSize(data.decompressedInput, contentWidth);
    inputLines.slice(0, 20).forEach((line: string) => {
      if (yPos > 265) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(line, margin, yPos);
      yPos += 4;
    });
    if (inputLines.length > 20) {
      addText('... [tronqué]', 8);
    }
    addLine(3);
  }

  // AI Output
  if (data.aiOutput) {
    addSection('SORTIE IA (RÉPONSE)');
    doc.setFont('courier', 'normal');
    doc.setFontSize(9);
    const outputLines = doc.splitTextToSize(data.aiOutput, contentWidth);
    outputLines.slice(0, 30).forEach((line: string) => {
      if (yPos > 265) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(line, margin, yPos);
      yPos += 4;
    });
    if (outputLines.length > 30) {
      addText('... [tronqué]', 8);
    }
  }

  // Legal Notice
  doc.addPage();
  yPos = 20;
  addSection('ATTESTATION DE CONFORMITÉ');
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  const legalText = `Ce certificat atteste que le bundle d'évidence référencé ci-dessus a été vérifié conformément aux protocoles de la plateforme AI Cognitive Evidence. 

La vérification inclut:
• Contrôle de l'intégrité des données via hash SHA-256
• Validation de l'horodatage RFC 3161
• Vérification de l'ancrage sur blockchain ${data.verificationResult.ledgerInfo?.network || 'N/A'}
• Authentification de la signature Ed25519

Ce document est généré automatiquement et fait foi de l'état de vérification au moment de sa génération. Pour toute contestation, veuillez conserver ce certificat et contacter l'administrateur de la plateforme.`;

  const legalLines = doc.splitTextToSize(legalText, contentWidth);
  legalLines.forEach((line: string) => {
    doc.text(line, margin, yPos);
    yPos += 5;
  });

  // QR Code placeholder
  addLine(10);
  doc.setDrawColor(200, 200, 200);
  doc.rect(margin, yPos, 40, 40, 'S');
  doc.setFontSize(7);
  doc.text('QR Code de vérification', margin + 2, yPos + 45);
  doc.text('(scan pour vérifier en ligne)', margin + 2, yPos + 50);

  // Footer on each page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Page ${i}/${pageCount} | Certificat d'Audit AI | Document Confidentiel | ${data.verificationResult.bundleId.substring(0, 20)}...`,
      pageWidth / 2,
      290,
      { align: 'center' }
    );
  }

  // Save
  const filename = `certificat-audit-${data.verificationResult.bundleId.substring(0, 15)}-${Date.now()}.pdf`;
  doc.save(filename);
}

/**
 * Export cognitive trace to PDF for external audit
 */
export async function exportCognitiveTracePDF(
  signatureResult: SignatureResponse,
  options: ExportOptions = {}
): Promise<void> {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 20;
  const contentWidth = pageWidth - margin * 2;
  let yPos = 20;

  const addLine = (height = 5) => {
    yPos += height;
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
  };

  const addText = (text: string, fontSize = 10, isBold = false) => {
    doc.setFontSize(fontSize);
    doc.setFont('helvetica', isBold ? 'bold' : 'normal');
    const lines = doc.splitTextToSize(text, contentWidth);
    doc.text(lines, margin, yPos);
    addLine(lines.length * (fontSize * 0.4) + 2);
  };

  const addSection = (title: string) => {
    addLine(5);
    doc.setFillColor(240, 240, 240);
    doc.rect(margin, yPos - 4, contentWidth, 8, 'F');
    addText(title, 12, true);
    addLine(2);
  };

  // Header
  doc.setFillColor(59, 130, 246);
  doc.rect(0, 0, pageWidth, 35, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(18);
  doc.setFont('helvetica', 'bold');
  doc.text('AI COGNITIVE EVIDENCE REPORT', margin, 15);
  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.text('Cryptographic Audit Trail for AI Response', margin, 24);
  doc.text(`Generated: ${new Date().toISOString()}`, margin, 30);
  
  doc.setTextColor(0, 0, 0);
  yPos = 45;

  // Signature Summary
  addSection('SIGNATURE SUMMARY');
  addText(`Signature ID: ${signatureResult.signatureId}`, 10, true);
  addText(`Algorithm: ${signatureResult.signature.algorithm}`);
  addText(`Signed At: ${new Date(signatureResult.signature.signed_at).toLocaleString()}`);
  addText(`Signer: ${signatureResult.signature.signer_identity}`);
  addText(`Includes Thought Signatures: ${signatureResult.signature.includes_thought_signatures ? 'Yes' : 'No'}`);

  // Model Information
  addSection('MODEL INFORMATION');
  addText(`Provider: ${signatureResult.signedPayload.model.provider}`);
  addText(`Model ID: ${signatureResult.signedPayload.model.model_id}`);
  addText(`Version: ${signatureResult.signedPayload.model.model_version}`);
  addText(`Snapshot: ${signatureResult.signedPayload.model.model_snapshot}`);

  // Cryptographic Proof
  addSection('CRYPTOGRAPHIC PROOF');
  addText('Output Hash (SHA-256):', 10, true);
  addText(signatureResult.signedPayload.output_hash, 8);
  addLine(3);
  addText('Ed25519 Signature:', 10, true);
  addText(signatureResult.signature.signature, 8);
  
  if (options.includeChainHash) {
    addLine(3);
    addText('Chain Hash (SHA-256):', 10, true);
    addText(options.includeChainHash, 8);
  }

  // Cognitive Trace
  if (signatureResult.cognitive_trace) {
    addSection('COGNITIVE TRACE');
    addText(`Total Reasoning Steps: ${signatureResult.cognitive_trace.reasoning_steps}`);
    addText(`Function Calls: ${signatureResult.cognitive_trace.function_calls}`);
    addText(`Thought Signatures: ${signatureResult.cognitive_trace.thought_signatures.length}`);
    
    addLine(5);
    addText('THOUGHT SIGNATURE CHAIN:', 11, true);
    addLine(3);

    signatureResult.cognitive_trace.thought_signatures.forEach((sig, idx) => {
      doc.setFillColor(idx % 2 === 0 ? 250 : 245, idx % 2 === 0 ? 250 : 245, idx % 2 === 0 ? 250 : 245);
      doc.rect(margin, yPos - 3, contentWidth, 20, 'F');
      
      addText(`Step ${sig.step_index + 1}: ${sig.step_type.toUpperCase()}`, 10, true);
      if (sig.associated_function) {
        addText(`Function: ${sig.associated_function}`, 9);
      }
      addText(`Signature: ${sig.signature.substring(0, 40)}...`, 8);
      addLine(5);
    });
  }

  // Timestamp Proof
  if (signatureResult.timestampProof) {
    addSection('TIMESTAMP PROOF (RFC 3161)');
    addText(`Timestamp: ${signatureResult.timestampProof.rfc3161_timestamp}`);
    addText(`Verified: ${signatureResult.timestampProof.verified ? 'Yes' : 'No'}`);
  }

  // Raw Payload (optional)
  if (options.includeRawPayload) {
    addSection('SIGNED PAYLOAD (JSON)');
    const jsonStr = JSON.stringify(signatureResult.signedPayload, null, 2);
    doc.setFontSize(7);
    doc.setFont('courier', 'normal');
    const jsonLines = doc.splitTextToSize(jsonStr, contentWidth);
    jsonLines.slice(0, 50).forEach((line: string) => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(line, margin, yPos);
      yPos += 3;
    });
    if (jsonLines.length > 50) {
      addText('... [truncated for brevity]', 8);
    }
  }

  // Footer on each page
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(128, 128, 128);
    doc.text(
      `Page ${i} of ${pageCount} | AI Cognitive Evidence Platform | Confidential Audit Document`,
      pageWidth / 2,
      290,
      { align: 'center' }
    );
  }

  // Save
  const filename = `cognitive-trace-${signatureResult.signatureId.substring(0, 8)}-${Date.now()}.pdf`;
  doc.save(filename);
}

export default { exportCognitiveTracePDF, exportAuditCertificatePDF };
