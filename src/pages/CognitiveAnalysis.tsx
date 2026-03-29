import { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { useSearchParams, useNavigate, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Brain, Share2, Download, ZoomIn, ZoomOut } from 'lucide-react';
import { readPipelineParams, isAutoRun, navigatePipeline } from '@/lib/pipeline-params';
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType,
  Node,
  Edge,
  BackgroundVariant,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { MainLayout } from '@/components/layout/MainLayout';
import { MetricCard } from '@/components/shared/MetricCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { CodeBlock } from '@/components/shared/CodeBlock';
import { LoadingOverlay } from '@/components/shared/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { api, CognitiveGraphResult } from '@/api/client';

const nodeColors = {
  concept: '#3B82F6',
  entity: '#10B981',
  action: '#F59E0B',
  relation: '#8B5CF6',
};

export default function CognitiveAnalysis() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const autoRunTriggered = useRef(false);

  const [executionId, setExecutionId] = useState('');
  const [analysisText, setAnalysisText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<CognitiveGraphResult | null>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const pipelineData = readPipelineParams(searchParams);
  const autoRun = isAutoRun(searchParams);

  // Auto-fill from pipeline params
  useEffect(() => {
    if (pipelineData.executionId && !executionId) {
      setExecutionId(pipelineData.executionId);
    }
    const stateText = (location.state as Record<string, unknown>)?.analysisText as string;
    if (stateText && !analysisText) {
      setAnalysisText(stateText);
    }
  }, [pipelineData.executionId, location.state]);

  // Auto-run
  useEffect(() => {
    if (autoRun && pipelineData.executionId && !autoRunTriggered.current && !isLoading && !result) {
      autoRunTriggered.current = true;
      const stateText = (location.state as Record<string, unknown>)?.analysisText as string || '';
      setTimeout(() => handleGenerateGraph(pipelineData.executionId, stateText), 300);
    }
  }, [autoRun, pipelineData.executionId]);

  const handleGenerateGraph = async (overrideExecId?: string, overrideText?: string) => {
    const execId = overrideExecId || executionId;
    const text = overrideText ?? analysisText;
    if (!execId.trim()) {
      toast.error('Please enter an execution ID');
      return;
    }

    setIsLoading(true);
    try {
      const response = await api.generateCognitiveGraph(execId, text);
      setResult(response);

      // Convert to React Flow format
      const flowNodes: Node[] = response.nodes.map((node, index) => ({
        id: node.id,
        data: { 
          label: node.label,
          type: node.type,
        },
        position: {
          x: 150 + (index % 4) * 200,
          y: 100 + Math.floor(index / 4) * 150,
        },
        style: {
          background: `${nodeColors[node.type]}20`,
          border: `2px solid ${nodeColors[node.type]}`,
          borderRadius: '12px',
          padding: '12px 16px',
          fontSize: '13px',
          fontWeight: 500,
          color: nodeColors[node.type],
        },
      }));

      const flowEdges: Edge[] = response.edges.map((edge, index) => ({
        id: `edge-${index}`,
        source: edge.source,
        target: edge.target,
        label: edge.label,
        animated: true,
        style: { stroke: '#6B7280', strokeWidth: 2 },
        labelStyle: { fontSize: 11, fill: '#6B7280' },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: '#6B7280',
        },
      }));

      setNodes(flowNodes);
      setEdges(flowEdges);
      toast.success('Cognitive graph generated!');
      // Auto-navigate to Signature
      if (autoRun || pipelineData.executionId) {
        navigatePipeline(
          navigate,
          '/signature',
          { ...pipelineData, executionId: execId, analysisId: response.id, cognitiveHash: response.cognitiveHash },
          { rawOutput: text, originalPrompt: (location.state as Record<string, unknown>)?.originalPrompt, aiResponse: (location.state as Record<string, unknown>)?.aiResponse },
        );
      }
    } catch (error) {
      toast.error('Failed to generate graph');
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportJSON = () => {
    if (result) {
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `cognitive-graph-${result.id}.json`;
      a.click();
      toast.success('Exported as JSON');
    }
  };

  return (
    <MainLayout title="Cognitive Analysis" subtitle="Generate knowledge graphs from AI outputs">
      <div className="grid gap-6 lg:grid-cols-3">
        {/* Input & Configuration */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="space-y-6"
        >
          <Card className="relative overflow-hidden">
            <AnimatePresence>
              {isLoading && <LoadingOverlay message="Generating cognitive graph..." />}
            </AnimatePresence>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Brain className="h-5 w-5 text-secondary" />
                Analysis Input
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Execution ID</Label>
                <Input
                  placeholder="e.g., id_1706123456789_abc123"
                  value={executionId}
                  onChange={(e) => setExecutionId(e.target.value)}
                  className="font-mono"
                />
              </div>

              <div className="space-y-2">
                <Label>Additional Analysis Context</Label>
                <Textarea
                  placeholder="Optional: Add additional context or focus areas for the cognitive analysis..."
                  value={analysisText}
                  onChange={(e) => setAnalysisText(e.target.value)}
                  className="min-h-[120px] resize-none"
                />
              </div>

              <Button onClick={handleGenerateGraph} className="w-full" disabled={isLoading}>
                <Share2 className="mr-2 h-4 w-4" />
                Generate Graph
              </Button>
            </CardContent>
          </Card>

          {/* Metrics */}
          {result && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="space-y-4"
            >
              <Card>
                <CardHeader>
                  <CardTitle>Graph Metrics</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <p className="text-2xl font-bold text-foreground">
                        {result.metrics.nodeCount}
                      </p>
                      <p className="text-xs text-muted-foreground">Nodes</p>
                    </div>
                    <div className="rounded-lg bg-muted/50 p-3 text-center">
                      <p className="text-2xl font-bold text-foreground">
                        {result.metrics.edgeCount}
                      </p>
                      <p className="text-xs text-muted-foreground">Edges</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Consistency</span>
                      <span className="font-mono text-sm">
                        {(result.metrics.consistencyScore * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-success rounded-full transition-all"
                        style={{ width: `${result.metrics.consistencyScore * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-muted-foreground">Complexity</span>
                      <span className="font-mono text-sm">
                        {(result.metrics.complexityScore * 100).toFixed(1)}%
                      </span>
                    </div>
                    <div className="h-2 rounded-full bg-muted overflow-hidden">
                      <div
                        className="h-full bg-secondary rounded-full transition-all"
                        style={{ width: `${result.metrics.complexityScore * 100}%` }}
                      />
                    </div>
                  </div>

                  <div className="pt-2 border-t">
                    <Label className="text-xs">Cognitive Hash</Label>
                    <code className="block mt-1 text-xs text-muted-foreground break-all bg-muted p-2 rounded">
                      {result.cognitiveHash.substring(0, 32)}...
                    </code>
                  </div>
                </CardContent>
              </Card>

              {/* Legend */}
              <Card>
                <CardHeader>
                  <CardTitle>Node Types</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {Object.entries(nodeColors).map(([type, color]) => (
                      <div key={type} className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: color }}
                        />
                        <span className="text-sm capitalize">{type}</span>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          )}
        </motion.div>

        {/* Graph Visualization */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          className="lg:col-span-2"
        >
          <Card className="h-[700px]">
            <CardHeader className="border-b">
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Knowledge Graph</CardTitle>
                  <CardDescription>
                    Interactive visualization of cognitive connections
                  </CardDescription>
                </div>
                {result && (
                  <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={handleExportJSON}>
                      <Download className="mr-2 h-4 w-4" />
                      Export JSON
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent className="p-0 h-[calc(100%-80px)]">
              {result ? (
                <ReactFlow
                  nodes={nodes}
                  edges={edges}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  fitView
                  className="bg-muted/30"
                >
                  <Background variant={BackgroundVariant.Dots} gap={20} size={1} />
                  <Controls />
                  <MiniMap 
                    nodeColor={(node) => nodeColors[node.data?.type as keyof typeof nodeColors] || '#6B7280'}
                    className="!bg-card border border-border rounded-lg"
                  />
                </ReactFlow>
              ) : (
                <div className="h-full flex items-center justify-center">
                  <div className="text-center p-8">
                    <div className="mx-auto w-20 h-20 rounded-2xl bg-gradient-to-br from-purple-500/20 to-pink-500/20 flex items-center justify-center mb-4">
                      <Brain className="h-10 w-10 text-secondary" />
                    </div>
                    <h3 className="text-lg font-semibold text-foreground mb-2">
                      No Graph Generated
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-sm">
                      Enter an execution ID and generate a cognitive graph to visualize the knowledge structure.
                    </p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </MainLayout>
  );
}
