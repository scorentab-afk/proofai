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
  pricePerCert: number;
  features: string[];
  traceQuality: 'native' | 'structured';
  icon: typeof Brain;
}

const PROVIDERS: ProviderOption[] = [
  {
    id: 'gemini',
    name: 'Gemini 2.5 Flash',
    description: 'Native chain-of-thought — Maximum cognitive traceability',
    isPremium: true,
    pricePerCert: 0.15,
    features: [
      'Native thought signatures',
      'Function call tracing',
      'Multi-step reasoning',
      'Recommended for legal/medical/finance'
    ],
    traceQuality: 'native',
    icon: Brain
  },
  {
    id: 'anthropic',
    name: 'Claude Sonnet 4',
    description: 'Structured reasoning via enhanced prompts',
    isPremium: false,
    pricePerCert: 0.08,
    features: [
      'XML reasoning trace',
      'Step-by-step analysis',
      'Excellent quality',
      'Cost-effective'
    ],
    traceQuality: 'structured',
    icon: Cpu
  },
  {
    id: 'openai',
    name: 'GPT-4 Turbo',
    description: 'Markdown structured reasoning',
    isPremium: false,
    pricePerCert: 0.08,
    features: [
      'Markdown reasoning trace',
      'Clear step breakdown',
      'Excellent quality',
      'Widely compatible'
    ],
    traceQuality: 'structured',
    icon: Zap
  }
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
          Select the AI provider for your certification. Premium providers offer native thought signatures.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 md:grid-cols-3">
          {PROVIDERS.map((provider) => {
            const Icon = provider.icon;
            const isSelected = value === provider.id;
            
            return (
              <div
                key={provider.id}
                onClick={() => onChange(provider.id)}
                className={cn(
                  "relative cursor-pointer rounded-xl border-2 p-4 transition-all hover:shadow-md",
                  isSelected
                    ? "border-primary bg-primary/5 shadow-md"
                    : "border-border hover:border-primary/50"
                )}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className={cn(
                      "rounded-lg p-2",
                      provider.isPremium 
                        ? "bg-gradient-to-br from-amber-500/20 to-orange-500/20" 
                        : "bg-muted"
                    )}>
                      <Icon className={cn(
                        "h-5 w-5",
                        provider.isPremium ? "text-amber-600" : "text-muted-foreground"
                      )} />
                    </div>
                    {provider.isPremium && (
                      <Badge className="bg-gradient-to-r from-amber-500 to-orange-500 text-white border-0">
                        <Sparkles className="h-3 w-3 mr-1" />
                        Premium
                      </Badge>
                    )}
                  </div>
                  
                  {isSelected && (
                    <div className="rounded-full bg-primary p-1">
                      <Check className="h-3 w-3 text-primary-foreground" />
                    </div>
                  )}
                </div>

                {/* Name & Description */}
                <h4 className="font-semibold text-sm mb-1">{provider.name}</h4>
                <p className="text-xs text-muted-foreground mb-3">{provider.description}</p>

                {/* Pricing */}
                <div className="mb-3 pb-3 border-b border-border">
                  <span className="text-2xl font-bold text-foreground">
                    €{provider.pricePerCert}
                  </span>
                  <span className="text-xs text-muted-foreground">/certification</span>
                </div>

                {/* Features */}
                <ul className="space-y-1.5 mb-3">
                  {provider.features.map((feature, idx) => (
                    <li key={idx} className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Check className="h-3 w-3 text-green-500 flex-shrink-0" />
                      {feature}
                    </li>
                  ))}
                </ul>

                {/* Quality indicator */}
                <div className="pt-2 border-t border-border">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-muted-foreground">Trace Quality:</span>
                    {provider.traceQuality === 'native' ? (
                      <span className="text-xs font-medium text-amber-600">
                        ⭐⭐⭐⭐⭐ Native
                      </span>
                    ) : (
                      <span className="text-xs font-medium text-blue-600">
                        ⭐⭐⭐⭐ Structured
                      </span>
                    )}
                  </div>
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
    case 'gemini':
      return 'gemini-2.5-flash';
    case 'anthropic':
      return 'claude-sonnet-4-20250514';
    case 'openai':
      return 'gpt-4-turbo';
  }
};

export { PROVIDERS };
