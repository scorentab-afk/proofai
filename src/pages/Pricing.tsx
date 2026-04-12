import { motion } from 'framer-motion';
import { Check, ArrowRight } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const betaFeatures = [
  'Full access to proofAI v1.3 at no cost for 6 months',
  'Bring Your Own Key mode — you keep full control of your Anthropic API tokens',
  'Direct founder support and guided integration',
  'Influence on the v1.4 multimodal and v2.0 AFNOR/FNFE-MPE standardization roadmap',
  'Lifetime preferential pricing after the beta ends',
];

export default function Pricing() {
  return (
    <MainLayout title="Pricing" subtitle="Private beta program">
      <div className="max-w-3xl mx-auto space-y-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2 mb-4">
            <span className="text-sm font-medium text-primary">Private Beta Program</span>
          </div>
          <h2 className="text-2xl md:text-3xl font-bold text-foreground mb-3">
            proofAI is currently in <em>private beta</em>.
          </h2>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            During this phase, our first design partners use proofAI for free in
            Bring Your Own Key mode: you provide your own Anthropic API key, and
            proofAI handles Ed25519 signing, Polygon mainnet anchoring, and the
            regulator portal at no cost.
          </p>
        </motion.div>

        {/* Main Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
        >
          <Card className="border-primary/30 shadow-lg">
            <CardHeader className="text-center pb-2">
              <CardTitle className="text-xl">Join the beta program</CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <p className="text-sm text-muted-foreground">
                We're selecting 5 to 10 design partners in April–May 2026 across
                banking, fintech, HR-tech, edtech and healthtech sectors. The
                program includes:
              </p>

              <ul className="space-y-3">
                {betaFeatures.map((feature) => (
                  <li key={feature} className="flex items-start gap-3 text-sm">
                    <Check className="h-4 w-4 text-green-500 mt-0.5 shrink-0" />
                    <span className="text-foreground">{feature}</span>
                  </li>
                ))}
              </ul>

              <Button
                asChild
                className="w-full"
                size="lg"
              >
                <a href="mailto:hello@proofai.eu?subject=Private%20Beta%20Program%20proofAI">
                  Apply to the program
                  <ArrowRight className="ml-2 h-4 w-4" />
                </a>
              </Button>
            </CardContent>
          </Card>
        </motion.div>

        {/* Disclaimer */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
          className="text-center text-sm italic text-muted-foreground"
        >
          — Post-beta pricing will be announced in June 2026 after real-world
          usage calibration —
        </motion.p>
      </div>
    </MainLayout>
  );
}
