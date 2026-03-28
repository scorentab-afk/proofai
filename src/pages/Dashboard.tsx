import { motion } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Cpu,
  Zap,
  Brain,
  Package,
  Link2,
  Shield,
  ArrowRight,
  Activity,
  CheckCircle2,
  Clock,
  TrendingUp,
} from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { MetricCard } from '@/components/shared/MetricCard';
import { StatusBadge } from '@/components/shared/StatusBadge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const workflows = [
  {
    title: 'Prompt Compressor',
    description: 'Compress prompts into efficient DSL format',
    icon: Cpu,
    href: '/compress',
    color: 'from-blue-500 to-cyan-500',
  },
  {
    title: 'AI Execution',
    description: 'Execute prompts with any AI model',
    icon: Zap,
    href: '/execute',
    color: 'from-orange-500 to-yellow-500',
  },
  {
    title: 'Cognitive Analysis',
    description: 'Generate knowledge graphs from outputs',
    icon: Brain,
    href: '/analyze',
    color: 'from-purple-500 to-pink-500',
  },
  {
    title: 'Evidence Bundle',
    description: 'Create immutable evidence packages',
    icon: Package,
    href: '/bundle',
    color: 'from-green-500 to-emerald-500',
  },
  {
    title: 'Blockchain Anchor',
    description: 'Anchor evidence to distributed ledger',
    icon: Link2,
    href: '/anchor',
    color: 'from-indigo-500 to-purple-500',
  },
  {
    title: 'Audit & Verify',
    description: 'Verify evidence integrity and provenance',
    icon: Shield,
    href: '/verify',
    color: 'from-teal-500 to-green-500',
  },
];

const recentActivity = [
  { action: 'Bundle Verified', id: 'BND-4521', time: '2 mins ago', status: 'success' as const },
  { action: 'AI Execution Complete', id: 'EXE-7832', time: '5 mins ago', status: 'success' as const },
  { action: 'Prompt Compressed', id: 'PRM-1294', time: '12 mins ago', status: 'success' as const },
  { action: 'Blockchain Anchor Pending', id: 'ANC-9012', time: '18 mins ago', status: 'pending' as const },
];

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

export default function Dashboard() {
  return (
    <MainLayout title="Dashboard" subtitle="AI Cognitive Evidence Platform Overview">
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        className="space-y-6"
      >
        {/* Hero Section */}
        <motion.div
          variants={itemVariants}
          className="relative overflow-hidden rounded-xl md:rounded-2xl bg-gradient-to-br from-primary via-primary to-secondary p-5 md:p-8 text-white"
        >
          <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzBoLTZ2Nmg2di02em0tNi02aC02djZoNnYtNnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-30" />
          <div className="relative z-10">
            <h2 className="text-xl md:text-2xl font-bold mb-2">Welcome to CogniEvidence</h2>
            <p className="text-white/80 max-w-xl mb-4 md:mb-6 text-sm md:text-base">
              Create verifiable AI evidence chains with blockchain-anchored cognitive analysis. 
              Build trust and transparency in AI operations.
            </p>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
              <Button asChild variant="secondary" className="bg-white text-primary hover:bg-white/90">
                <Link to="/compress">
                  Get Started <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button variant="ghost" className="text-white border-white/30 hover:bg-white/10">
                View Documentation
              </Button>
            </div>
          </div>
        </motion.div>

        {/* Metrics */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <MetricCard
            label="Prompts Compressed"
            value="1,247"
            change="+12% from last week"
            changeType="positive"
            icon={Cpu}
          />
          <MetricCard
            label="AI Executions"
            value="3,891"
            change="+8% from last week"
            changeType="positive"
            icon={Zap}
          />
          <MetricCard
            label="Bundles Created"
            value="892"
            change="+15% from last week"
            changeType="positive"
            icon={Package}
          />
          <MetricCard
            label="Verified Evidence"
            value="756"
            change="99.8% success rate"
            changeType="positive"
            icon={Shield}
          />
        </motion.div>

        {/* Workflow Grid & Activity */}
        <div className="grid gap-4 md:gap-6 lg:grid-cols-3">
          {/* Workflows */}
          <motion.div variants={itemVariants} className="lg:col-span-2">
            <Card>
              <CardHeader className="pb-3 md:pb-6">
                <CardTitle className="text-base md:text-lg">Platform Workflows</CardTitle>
                <CardDescription className="text-xs md:text-sm">
                  Navigate through the cognitive evidence pipeline
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3">
                  {workflows.map((workflow) => (
                    <Link
                      key={workflow.href}
                      to={workflow.href}
                      className="group relative flex items-center gap-3 md:gap-4 rounded-lg md:rounded-xl border border-border p-3 md:p-4 transition-all hover:border-primary/50 hover:shadow-md"
                    >
                      <div
                        className={`flex h-10 w-10 md:h-12 md:w-12 items-center justify-center rounded-lg bg-gradient-to-br ${workflow.color} shadow-lg flex-shrink-0`}
                      >
                        <workflow.icon className="h-5 w-5 md:h-6 md:w-6 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="font-semibold text-sm md:text-base text-foreground group-hover:text-primary transition-colors">
                          {workflow.title}
                        </h3>
                        <p className="text-xs md:text-sm text-muted-foreground truncate">
                          {workflow.description}
                        </p>
                      </div>
                      <ArrowRight className="h-4 w-4 text-muted-foreground opacity-0 group-hover:opacity-100 group-hover:translate-x-1 transition-all hidden sm:block" />
                    </Link>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Recent Activity */}
          <motion.div variants={itemVariants}>
            <Card className="h-full">
              <CardHeader className="pb-3 md:pb-6">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-base md:text-lg">
                    <Activity className="h-4 w-4 md:h-5 md:w-5 text-primary" />
                    Recent Activity
                  </CardTitle>
                </div>
              </CardHeader>
              <CardContent className="pb-4 md:pb-6">
                <div className="space-y-4">
                  {recentActivity.map((activity, index) => (
                    <div
                      key={index}
                      className="flex items-start gap-3 pb-4 border-b border-border last:border-0 last:pb-0"
                    >
                      <div className="mt-1">
                        {activity.status === 'success' ? (
                          <CheckCircle2 className="h-4 w-4 text-success" />
                        ) : (
                          <Clock className="h-4 w-4 text-warning" />
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-foreground">
                          {activity.action}
                        </p>
                        <div className="flex items-center gap-2 mt-1">
                          <code className="text-xs text-muted-foreground bg-muted px-1.5 py-0.5 rounded">
                            {activity.id}
                          </code>
                          <span className="text-xs text-muted-foreground">
                            {activity.time}
                          </span>
                        </div>
                      </div>
                      <StatusBadge status={activity.status}>
                        {activity.status === 'success' ? 'Done' : 'Pending'}
                      </StatusBadge>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Performance Chart */}
        <motion.div variants={itemVariants}>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Platform Performance
                  </CardTitle>
                  <CardDescription>
                    Processing metrics over the last 7 days
                  </CardDescription>
                </div>
                <StatusBadge status="success">All Systems Operational</StatusBadge>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                <div className="text-center">
                  <Activity className="h-12 w-12 mx-auto mb-3 text-muted-foreground/50" />
                  <p className="text-sm">Performance charts will display real-time data here</p>
                  <p className="text-xs text-muted-foreground/70 mt-1">Connect to backend API to enable</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </MainLayout>
  );
}
