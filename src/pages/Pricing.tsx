import { motion } from 'framer-motion';
import { Check, X, Sparkles, Shield, Zap, Building2, CreditCard } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: '0',
    unit: '',
    description: '100 proofs to get started',
    icon: Zap,
    popular: false,
    highlight: '100 proofs included',
    features: [
      { name: '100 proofs total', included: true },
      { name: 'All providers (Claude, GPT, Gemini)', included: true },
      { name: 'Ed25519 signature · No blockchain', included: true },
      { name: 'Cognitive analysis', included: true },
      { name: 'Verify bundles', included: true },
    ],
  },
  {
    id: 'payg',
    name: 'Pay-as-you-go',
    price: '0.05',
    unit: '/proof',
    description: 'No commitment, pay what you use',
    icon: CreditCard,
    popular: false,
    highlight: 'No monthly fee',
    features: [
      { name: 'Unlimited proofs', included: true },
      { name: 'All providers', included: true },
      { name: 'Ed25519 signing', included: true },
      { name: 'Blockchain anchoring', included: true },
      { name: 'Cognitive analysis', included: true },
      { name: 'Human oversight (Art. 14)', included: true },
    ],
  },
  {
    id: 'indie',
    name: 'Indie',
    price: '9',
    unit: '/mo',
    description: '500 proofs included',
    icon: Sparkles,
    popular: false,
    highlight: '500 proofs = 0.018/proof',
    features: [
      { name: '500 proofs/month included', included: true },
      { name: 'Overage: 0.04/proof', included: true },
      { name: 'All providers', included: true },
      { name: 'Full pipeline', included: true },
      { name: 'Post-market monitoring', included: true },
      { name: 'PDF certificates', included: true },
    ],
  },
  {
    id: 'startup',
    name: 'Startup',
    price: '29',
    unit: '/mo',
    description: '2,000 proofs included',
    icon: Shield,
    popular: true,
    highlight: '2000 proofs = 0.015/proof',
    features: [
      { name: '2,000 proofs/month included', included: true },
      { name: 'Overage: 0.03/proof', included: true },
      { name: 'All providers', included: true },
      { name: 'Full pipeline', included: true },
      { name: 'Post-market monitoring', included: true },
      { name: 'Priority support', included: true },
    ],
  },
  {
    id: 'scale',
    name: 'Scale',
    price: '99',
    unit: '/mo',
    description: '10,000 proofs included',
    icon: Building2,
    popular: false,
    highlight: '10000 proofs = 0.01/proof',
    features: [
      { name: '10,000 proofs/month included', included: true },
      { name: 'Overage: 0.02/proof', included: true },
      { name: 'All providers', included: true },
      { name: 'Full pipeline + SSO', included: true },
      { name: 'High availability', included: true },
      { name: 'Dedicated support', included: true },
    ],
  },
];

export default function Pricing() {
  const handleSubscribe = (planId: string) => {
    if (planId === 'free') {
      toast.success('Free plan active! Create your API key in Settings.');
      return;
    }
    const checkoutUrl = import.meta.env.VITE_STRIPE_CHECKOUT_URL;
    if (checkoutUrl) {
      window.open(`${checkoutUrl}?plan=${planId}`, '_blank');
    } else {
      toast.info('Stripe checkout coming soon. Contact us to subscribe.');
    }
  };

  return (
    <MainLayout title="Pricing" subtitle="Pay only for the proofs you generate">
      <div className="max-w-7xl mx-auto">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <div className="inline-flex items-center gap-2 bg-primary/10 rounded-full px-4 py-2 mb-4">
            <span className="text-3xl font-bold text-primary">0.05</span>
            <span className="text-sm text-muted-foreground">/proof</span>
          </div>
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            1 proof = compress + execute + analyze + sign + anchor + verify.
            Vanta charges $5,000/year for a self-signed certificate.
            We charge $0.05 for a blockchain-verified proof.
          </p>
        </motion.div>

        {/* Plans Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-5">
          {plans.map((plan, index) => {
            const Icon = plan.icon;
            return (
              <motion.div
                key={plan.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
              >
                <Card
                  className={`relative h-full flex flex-col ${
                    plan.popular
                      ? 'border-primary shadow-lg shadow-primary/20'
                      : 'border-border'
                  }`}
                >
                  {plan.popular && (
                    <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                      <Badge className="bg-primary text-primary-foreground">
                        Most popular
                      </Badge>
                    </div>
                  )}
                  <CardHeader className="text-center pb-2">
                    <div className="mx-auto w-12 h-12 rounded-xl bg-primary/10 flex items-center justify-center mb-3">
                      <Icon className="h-6 w-6 text-primary" />
                    </div>
                    <CardTitle className="text-lg">{plan.name}</CardTitle>
                    <CardDescription className="text-xs">{plan.description}</CardDescription>
                    <div className="pt-2">
                      <span className="text-3xl font-bold">
                        {plan.price === '0' && plan.id === 'free' ? 'Free' : `\u20AC${plan.price}`}
                      </span>
                      {plan.unit && (
                        <span className="text-sm text-muted-foreground">{plan.unit}</span>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-1">{plan.highlight}</p>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <ul className="space-y-2 flex-1 mb-6">
                      {plan.features.map((feature) => (
                        <li key={feature.name} className="flex items-start gap-2 text-xs">
                          <Check className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                          <span className="text-foreground">{feature.name}</span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      onClick={() => handleSubscribe(plan.id)}
                      variant={plan.popular ? 'default' : 'outline'}
                      className="w-full"
                      size="sm"
                    >
                      {plan.price === '0' && plan.id === 'free'
                        ? 'Start free'
                        : plan.id === 'payg'
                        ? 'Get API key'
                        : 'Subscribe'}
                    </Button>
                    {plan.id === 'free' && (
                      <p className="text-[11px] text-muted-foreground text-center mt-2">
                        Blockchain anchoring from €0.05/proof
                      </p>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* SDK */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-12 text-center"
        >
          <Card className="bg-muted/30 max-w-2xl mx-auto">
            <CardContent className="pt-6">
              <h3 className="font-semibold text-lg mb-2">npm install @proofai/sdk</h3>
              <code className="block bg-sidebar text-sidebar-foreground rounded-lg p-3 text-sm mb-3">
                {`const cert = await proofai.certify(prompt, { provider: 'anthropic' })`}
              </code>
              <p className="text-sm text-muted-foreground">
                One line of code. One proof. One blockchain-verified certificate.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </MainLayout>
  );
}
