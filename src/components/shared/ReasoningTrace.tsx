import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, Brain, Lightbulb, Search, CheckCircle, MessageSquare, Code } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ReasoningStep {
  step_index: number;
  type: 'analysis' | 'evidence' | 'evaluation' | 'conclusion' | 'reasoning' | 'function_call' | 'text';
  content: string;
  thought_signature?: string;
}

interface Props {
  steps: ReasoningStep[];
  quality: 'native' | 'structured' | 'inferred';
  provider: string;
}

const stepTypeConfig = {
  analysis: { icon: Search, color: 'bg-blue-500', label: 'Analysis' },
  evidence: { icon: Lightbulb, color: 'bg-green-500', label: 'Evidence' },
  evaluation: { icon: Brain, color: 'bg-yellow-500', label: 'Evaluation' },
  conclusion: { icon: CheckCircle, color: 'bg-purple-500', label: 'Conclusion' },
  reasoning: { icon: Brain, color: 'bg-indigo-500', label: 'Reasoning' },
  function_call: { icon: Code, color: 'bg-red-500', label: 'Function Call' },
  text: { icon: MessageSquare, color: 'bg-gray-500', label: 'Text' }
};

export function ReasoningTrace({ steps, quality, provider }: Props) {
  const [expandedSteps, setExpandedSteps] = useState<Set<number>>(new Set([0]));

  const toggleStep = (index: number) => {
    const newSet = new Set(expandedSteps);
    if (newSet.has(index)) {
      newSet.delete(index);
    } else {
      newSet.add(index);
    }
    setExpandedSteps(newSet);
  };

  const getQualityBadge = () => {
    switch (quality) {
      case 'native':
        return (
          <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
            ⭐⭐⭐⭐⭐ Native Thought Signatures
          </Badge>
        );
      case 'structured':
        return (
          <Badge className="bg-gradient-to-r from-blue-500 to-cyan-500 text-white border-0">
            ⭐⭐⭐⭐ Structured Reasoning
          </Badge>
        );
      case 'inferred':
        return (
          <Badge variant="secondary">
            ⭐⭐⭐ Inferred Reasoning
          </Badge>
        );
    }
  };

  if (!steps || steps.length === 0) {
    return null;
  }

  const reasoningDepth = Math.min(steps.length, 5);

  return (
    <Card>
      {/* Header */}
      <CardHeader>
        <div className="flex items-center justify-between flex-wrap gap-2">
          <CardTitle className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            Cognitive Trace
          </CardTitle>
          {getQualityBadge()}
        </div>
        <CardDescription>
          {quality === 'native' 
            ? `Native thought signatures from ${provider}`
            : `Structured reasoning trace parsed from ${provider} response`}
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Stats */}
        <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded-lg">
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Total Steps</p>
            <p className="text-2xl font-bold">{steps.length}</p>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Reasoning Depth</p>
            <div className="flex justify-center gap-1 mt-1">
              {[...Array(5)].map((_, i) => (
                <div
                  key={i}
                  className={cn(
                    "w-4 h-4 rounded-sm",
                    i < reasoningDepth ? "bg-primary" : "bg-muted"
                  )}
                />
              ))}
            </div>
          </div>
          <div className="text-center">
            <p className="text-xs text-muted-foreground">Quality</p>
            <p className={cn(
              "text-lg font-bold",
              quality === 'native' ? "text-amber-600" : "text-blue-600"
            )}>
              {quality === 'native' ? 'Max' : 'High'}
            </p>
          </div>
        </div>

        {/* Timeline */}
        <div className="space-y-2">
          {steps.map((step, idx) => {
            const config = stepTypeConfig[step.type] || stepTypeConfig.text;
            const Icon = config.icon;
            const isExpanded = expandedSteps.has(idx);

            return (
              <motion.div
                key={idx}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.05 }}
                className="border rounded-lg overflow-hidden"
              >
                <button
                  onClick={() => toggleStep(idx)}
                  className="w-full p-3 flex items-center justify-between hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "flex items-center justify-center w-8 h-8 rounded-full text-white text-sm font-medium",
                      config.color
                    )}>
                      {idx + 1}
                    </div>
                    <div className="text-left">
                      <p className="font-medium text-sm">Step {idx + 1}</p>
                      <div className="flex items-center gap-2">
                        <Icon className="h-3 w-3 text-muted-foreground" />
                        <span className="text-xs text-muted-foreground">{config.label}</span>
                      </div>
                    </div>
                  </div>
                  {isExpanded ? (
                    <ChevronUp className="h-4 w-4 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-muted-foreground" />
                  )}
                </button>

                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t bg-muted/30"
                    >
                      <div className="p-4">
                        <p className="text-sm text-foreground whitespace-pre-wrap">
                          {step.content}
                        </p>
                        {step.thought_signature && (
                          <div className="mt-3 p-2 bg-muted rounded text-xs font-mono text-muted-foreground">
                            Signature: {step.thought_signature}
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>

        {/* Visual chain */}
        <div className="flex items-center justify-center gap-1 pt-4">
          {steps.map((step, idx) => {
            const config = stepTypeConfig[step.type] || stepTypeConfig.text;
            return (
              <div key={idx} className="flex items-center">
                <div className={cn(
                  "w-6 h-6 rounded-full flex items-center justify-center text-white text-xs",
                  config.color
                )}>
                  {idx + 1}
                </div>
                {idx < steps.length - 1 && (
                  <div className="w-6 h-0.5 bg-muted" />
                )}
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}
