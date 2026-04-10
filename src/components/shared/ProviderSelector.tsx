import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Check, Sparkles, Brain, Cpu, Zap } from 'lucide-react';
import { cn } from '@/lib/utils';

export type AIProvider = 'gemini' | 'anthropic' | 'openai';

interface ProviderOption {
  id: AIProvider;
  name: string;
  description: string;
  isPremium: boolean;
  features: string[];
  traceQuality: 'native' | 'structured';
  icon: typeof Brain;
}

const PROVIDERS: ProviderOption[] = [
  {
    id: 'gemini',
    name: 'Gemini 2.5 Flash',
    description: 'Native chain-of-thought — maximum cognitive traceability',
    isPremium: true,
    features: [
      'Native thought signatures',
      'Function call tracing',
      'Multi-step reasoning',
      'Recommended for legal / medical / finance',
    ],
    traceQuality: 'native',
    icon: Brain,
  },
  {
    id: 'anthropic',
    name: 'Claude Sonnet 4',
    description: 'Extended Thinking natif — raisonnement interne certifié',
    isPremium: true,
    features: [
      'Native CoT',
      'Extended Thinking blocks',
      'Thought signatures cryptographiques',
      'Recommandé finance / légal',
    ],
    traceQuality: 'native',
    icon: Cpu,
  },
  {
    id: 'openai',
    name: 'GPT-4 Turbo',
    description: 'Structured reasoning with clear step breakdown',
    isPremium: false,
    features: [
      'Markdown reasoning trace',
      'Clear step breakdown',
      'Excellent quality',
      'Widely compatible',
    ],
    traceQuality: 'structured',
    icon: Zap,
  },
];

interface Props {
  value: AIProvider;
  onChange: (provider: AIProvider) => void;
}

export function ProviderSelector({ value, onChange }: Props) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Brain className="h-5 w-5 text-primary" />
          Choose AI Provider
        </CardTitle>
        <CardDescription>
          Select the provider for this certification. Native providers expose real thinking blocks.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-3 md:grid-cols-3">
          {PROVIDERS.map((provider) => {
            const Icon = provider.icon;
            const isSelected = value === provider.id;

            return (
              <div
                key={provider.id}
                onClick={() => onChange(provider.id)}
                className={cn(
                  'relative cursor-pointer rounded-xl border-2 p-4 transition-all hover:shadow-md',
                  isSelected
                    ? 'border-primary bg-primary/5 shadow-md'
                    : 'border-border hover:border-primary/50'
                )}
              >
                {/* Header row */}
                <div className="flex items-start justify-between mb-3">
                  <div className={cn(
                    'rounded-lg p-2',
                    provider.isPremium ? 'bg-amber-500/10' : 'bg-muted'
                  )}>
                    <Icon className={cn(
                      'h-5 w-5',
                      provider.isPremium ? 'text-amber-600' : 'text-muted-foreground'
                    )} />
                  </div>
                  {isSelected && (
                    <div className="rounded-full bg-primary p-1">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                </div>

                {/* Name + badge */}
                <div className="flex items-center gap-2 mb-1">
                  <h4 className="font-semibold text-sm">{provider.name}</h4>
                  {provider.isPremium && (
                    <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0 text-[10px] px-1.5 py-0">
                      <Sparkles className="h-2.5 w-2.5 mr-0.5" />
                      Premium
                    </Badge>
                  )}
                </div>

                {/* Description */}
                <p className="text-xs text-muted-foreground mb-3 leading-snug">{provider.description}</p>

                {/* Features */}
                <ul className="space-y-1.5 mb-3">
                  {provider.features.map((feature, idx) => (
                    <li key={idx} className="flex items-start gap-2 text-xs text-muted-foreground">
                      <Check className="h-3 w-3 text-green-500 flex-shrink-0 mt-0.5" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* Trace quality */}
                <div className="pt-2 border-t border-border flex items-center justify-between">
                  <span className="text-xs text-muted-foreground">Trace Quality</span>
                  {provider.traceQuality === 'native' ? (
                    <span className="text-xs font-semibold text-amber-600">⭐⭐⭐⭐⭐ Native</span>
                  ) : (
                    <span className="text-xs font-semibold text-blue-600">⭐⭐⭐⭐ Structured</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

export const getModelForProvider = (provider: AIProvider): string => {
  switch (provider) {
    case 'gemini':    return 'gemini-2.5-flash';
    case 'anthropic': return 'claude-sonnet-4-20250514';
    case 'openai':    return 'gpt-4-turbo';
  }
};

export { PROVIDERS };
