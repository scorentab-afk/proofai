import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Code2, Workflow, ChevronDown, Copy, CheckCircle2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { GeminiThoughtSignature } from '@/api/client';

interface Props {
  thoughtSignatures: GeminiThoughtSignature[];
  reasoningSteps?: number;
  functionCalls?: number;
  onCopySignature?: (signature: string, label: string) => void;
}

export function GeminiThoughtTrace({ 
  thoughtSignatures, 
  reasoningSteps, 
  functionCalls,
  onCopySignature 
}: Props) {
  const [expandedStep, setExpandedStep] = useState<number | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  if (!thoughtSignatures || thoughtSignatures.length === 0) {
    return null;
  }

  const handleCopy = (signature: string, idx: number) => {
    navigator.clipboard.writeText(signature);
    setCopiedIndex(idx);
    setTimeout(() => setCopiedIndex(null), 2000);
    onCopySignature?.(signature, `Step ${idx + 1} Signature`);
  };

  const getStepTypeStyles = (stepType: string) => {
    switch (stepType) {
      case 'function_call':
        return {
          bg: 'bg-warning/10',
          border: 'border-warning/30',
          dot: 'bg-warning',
          text: 'text-warning',
          icon: Code2,
        };
      case 'reasoning':
        return {
          bg: 'bg-secondary/10',
          border: 'border-secondary/30',
          dot: 'bg-secondary',
          text: 'text-secondary',
          icon: Brain,
        };
      default: // text
        return {
          bg: 'bg-primary/10',
          border: 'border-primary/30',
          dot: 'bg-primary',
          text: 'text-primary',
          icon: Workflow,
        };
    }
  };

  return (
    <div className="bg-gradient-to-br from-secondary/5 via-primary/5 to-secondary/10 rounded-xl p-6 border border-secondary/20">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-secondary to-primary flex items-center justify-center">
          <Brain className="w-5 h-5 text-white" />
        </div>
        <div>
          <h3 className="text-lg font-semibold text-foreground">
            Gemini Cognitive Trace
          </h3>
          <p className="text-sm text-muted-foreground">
            Cryptographic proof of each reasoning step
          </p>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-3 gap-3 mb-6">
        <motion.div 
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-card p-4 rounded-lg border border-border shadow-sm"
        >
          <div className="text-xs text-muted-foreground font-medium">Total Signatures</div>
          <div className="text-2xl font-bold text-secondary">{thoughtSignatures.length}</div>
        </motion.div>
        
        {reasoningSteps !== undefined && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-card p-4 rounded-lg border border-border shadow-sm"
          >
            <div className="text-xs text-muted-foreground font-medium">Reasoning Steps</div>
            <div className="text-2xl font-bold text-primary">{reasoningSteps}</div>
          </motion.div>
        )}
        
        {functionCalls !== undefined && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="bg-card p-4 rounded-lg border border-border shadow-sm"
          >
            <div className="text-xs text-muted-foreground font-medium">Function Calls</div>
            <div className="text-2xl font-bold text-warning">{functionCalls}</div>
          </motion.div>
        )}
      </div>

      {/* Thought Signature Timeline */}
      <div className="space-y-2">
        <div className="text-sm font-semibold text-foreground mb-3">Reasoning Chain:</div>
        
        {thoughtSignatures.map((sig, idx) => {
          const styles = getStepTypeStyles(sig.step_type);
          const Icon = styles.icon;
          const isExpanded = expandedStep === idx;
          
          return (
            <motion.div
              key={idx}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.05 }}
              className={cn(
                "bg-card rounded-lg border overflow-hidden transition-all",
                isExpanded ? "border-secondary/50 shadow-md" : "border-border"
              )}
            >
              <button
                onClick={() => setExpandedStep(isExpanded ? null : idx)}
                className="w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center",
                    styles.bg
                  )}>
                    <Icon className={cn("w-5 h-5", styles.text)} />
                  </div>
                  
                  <div className="text-left">
                    <div className="font-medium text-foreground">
                      Step {sig.step_index + 1}
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-2">
                      <span className={cn("w-2 h-2 rounded-full", styles.dot)} />
                      {sig.step_type === 'function_call' && (
                        <span>Function: <code className="text-warning">{sig.associated_function}</code></span>
                      )}
                      {sig.step_type === 'reasoning' && 'Internal Reasoning'}
                      {sig.step_type === 'text' && 'Text Output'}
                    </div>
                  </div>
                </div>
                
                <ChevronDown className={cn(
                  "w-5 h-5 text-muted-foreground transition-transform",
                  isExpanded && "rotate-180"
                )} />
              </button>
              
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: "auto", opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-4 border-t border-border">
                      <div className="mt-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs font-semibold text-muted-foreground">
                            Thought Signature:
                          </span>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleCopy(sig.signature, idx);
                            }}
                            className="h-7 px-2"
                          >
                            {copiedIndex === idx ? (
                              <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />
                            ) : (
                              <Copy className="w-3.5 h-3.5" />
                            )}
                          </Button>
                        </div>
                        <div className="p-3 bg-muted/50 rounded-lg font-mono text-xs break-all text-foreground border border-border">
                          {sig.signature}
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}
      </div>

      {/* Visual Chain Indicator */}
      <div className="mt-6 flex items-center justify-center gap-1">
        {thoughtSignatures.map((sig, idx) => {
          const styles = getStepTypeStyles(sig.step_type);
          
          return (
            <div key={idx} className="flex items-center">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.5 + idx * 0.1 }}
                className={cn(
                  "w-3 h-3 rounded-full",
                  styles.dot,
                  expandedStep === idx && "ring-2 ring-offset-2 ring-offset-background ring-secondary"
                )}
              />
              {idx < thoughtSignatures.length - 1 && (
                <motion.div 
                  initial={{ scaleX: 0 }}
                  animate={{ scaleX: 1 }}
                  transition={{ delay: 0.6 + idx * 0.1 }}
                  className="w-8 h-0.5 bg-border origin-left" 
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Legend */}
      <div className="mt-4 flex items-center justify-center gap-6 text-xs text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-secondary" />
          <span>Reasoning</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-warning" />
          <span>Function Call</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-primary" />
          <span>Text Output</span>
        </div>
      </div>
    </div>
  );
}

export default GeminiThoughtTrace;
