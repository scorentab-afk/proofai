import { motion } from 'framer-motion';
import { Check, X, Sparkles, Shield, Zap, Building2 } from 'lucide-react';
import { MainLayout } from '@/components/layout/MainLayout';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';

const plans = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    period: '',
    description: 'Pour tester et explorer',
    icon: Zap,
    popular: false,
    features: [
      { name: 'Compress (10/jour)', included: true },
      { name: 'Execute 1 provider (5/jour)', included: true },
      { name: 'Verify bundles', included: true },
      { name: 'Cognitive Analysis', included: false },
      { name: 'Ed25519 Signing', included: false },
      { name: 'Evidence Bundles', included: false },
      { name: 'Blockchain Anchoring', included: false },
      { name: 'PDF Certificates', included: false },
    ],
  },
  {
    id: 'indie',
    name: 'Indie',
    price: 9,
    period: '/mois',
    description: 'Solo dev, side projects',
    icon: Sparkles,
    popular: false,
    features: [
      { name: 'Compress (100/jour)', included: true },
      { name: 'Execute 1 provider (50/jour)', included: true },
      { name: 'Verify bundles', included: true },
      { name: 'Cognitive Analysis', included: true },
      { name: 'Ed25519 Signing', included: false },
      { name: 'Evidence Bundles', included: false },
      { name: 'Blockchain Anchoring', included: false },
      { name: 'PDF Certificates', included: false },
    ],
  },
  {
    id: 'startup',
    name: 'Startup',
    price: 29,
    period: '/mois',
    description: 'Startup 1-10 personnes',
    icon: Shield,
    popular: true,
    features: [
      { name: 'Compress illimite', included: true },
      { name: 'Execute multi-provider illimite', included: true },
      { name: 'Verify bundles', included: true },
      { name: 'Cognitive Analysis', included: true },
      { name: 'Ed25519 Signing', included: true },
      { name: 'Evidence Bundles', included: true },
      { name: 'Blockchain Anchoring', included: false },
      { name: 'PDF Certificates', included: false },
    ],
  },
  {
    id: 'scale',
    name: 'Scale',
    price: 99,
    period: '/mois',
    description: 'PME, scale-up',
    icon: Zap,
    popular: false,
    features: [
      { name: 'Compress illimite', included: true },
      { name: 'Execute multi-provider illimite', included: true },
      { name: 'Verify bundles', included: true },
      { name: 'Cognitive Analysis', included: true },
      { name: 'Ed25519 Signing', included: true },
      { name: 'Evidence Bundles', included: true },
      { name: 'Blockchain Anchoring', included: true },
      { name: 'PDF Certificates', included: true },
    ],
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 499,
    period: '/mois',
    description: 'Grands comptes, SLA',
    icon: Building2,
    popular: false,
    features: [
      { name: 'Tout Scale +', included: true },
      { name: 'SLA 99.9%', included: true },
      { name: 'Support prioritaire', included: true },
      { name: 'Integrations custom', included: true },
      { name: 'Dedicated infrastructure', included: true },
      { name: 'Audit compliance reports', included: true },
      { name: 'SSO / SAML', included: true },
      { name: 'On-premise option', included: true },
    ],
  },
];

export default function Pricing() {
  const handleSubscribe = (planId: string) => {
    if (planId === 'free') {
      toast.success('Le plan Free est actif ! Creez votre API key dans Settings.');
      return;
    }
    if (planId === 'enterprise') {
      window.open('mailto:contact@proofai.dev?subject=ProofAI Enterprise', '_blank');
      return;
    }
    // Stripe Checkout redirect
    const checkoutUrl = import.meta.env.VITE_STRIPE_CHECKOUT_URL;
    if (checkoutUrl) {
      window.open(`${checkoutUrl}?plan=${planId}`, '_blank');
    } else {
      toast.info('Stripe Checkout sera configure prochainement. Contactez-nous pour souscrire.');
    }
  };

  return (
    <MainLayout title="Pricing" subtitle="Choisissez le plan adapte a vos besoins">
      <div className="max-w-7xl mx-auto">
        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-12"
        >
          <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
            Vanta facture $5,000/an pour un certificat qu'ils signent eux-memes.
            ProofAI vous donne une preuve verifiable sur Polygonscan.
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
                        Populaire
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
                        {plan.price === 0 ? 'Gratuit' : `€${plan.price}`}
                      </span>
                      {plan.period && (
                        <span className="text-sm text-muted-foreground">{plan.period}</span>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col">
                    <ul className="space-y-2 flex-1 mb-6">
                      {plan.features.map((feature) => (
                        <li key={feature.name} className="flex items-start gap-2 text-xs">
                          {feature.included ? (
                            <Check className="h-3.5 w-3.5 text-green-500 mt-0.5 shrink-0" />
                          ) : (
                            <X className="h-3.5 w-3.5 text-muted-foreground/40 mt-0.5 shrink-0" />
                          )}
                          <span className={feature.included ? 'text-foreground' : 'text-muted-foreground/50'}>
                            {feature.name}
                          </span>
                        </li>
                      ))}
                    </ul>
                    <Button
                      onClick={() => handleSubscribe(plan.id)}
                      variant={plan.popular ? 'default' : 'outline'}
                      className="w-full"
                      size="sm"
                    >
                      {plan.price === 0
                        ? 'Commencer gratuitement'
                        : plan.id === 'enterprise'
                        ? 'Nous contacter'
                        : 'Souscrire'}
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Bottom CTA */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="mt-12 text-center"
        >
          <Card className="bg-muted/30 max-w-2xl mx-auto">
            <CardContent className="pt-6">
              <h3 className="font-semibold text-lg mb-2">SDK npm pour integration automatisee</h3>
              <code className="block bg-sidebar text-sidebar-foreground rounded-lg p-3 text-sm mb-3">
                npm install @proofai/sdk
              </code>
              <p className="text-sm text-muted-foreground">
                Une ligne de code = preuve cryptographique complete.
                Fonctionne avec tous les plans.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </MainLayout>
  );
}
