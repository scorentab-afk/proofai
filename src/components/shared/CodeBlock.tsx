import { cn } from '@/lib/utils';

interface CodeBlockProps {
  code: string;
  language?: string;
  className?: string;
}

export function CodeBlock({ code, language = 'json', className }: CodeBlockProps) {
  return (
    <div className={cn('relative rounded-lg bg-sidebar overflow-hidden', className)}>
      {language && (
        <div className="flex items-center justify-between border-b border-sidebar-border px-4 py-2">
          <span className="text-xs font-medium text-sidebar-muted uppercase tracking-wider">
            {language}
          </span>
          <button
            onClick={() => navigator.clipboard.writeText(code)}
            className="text-xs text-sidebar-muted hover:text-sidebar-foreground transition-colors"
          >
            Copy
          </button>
        </div>
      )}
      <pre className="overflow-x-auto p-4">
        <code className="text-sm font-mono text-sidebar-foreground leading-relaxed">
          {code}
        </code>
      </pre>
    </div>
  );
}
