import { cn } from '@/lib/utils';

interface StatusBadgeProps {
  status: 'pending' | 'processing' | 'success' | 'error' | 'info' | 'ai';
  children: React.ReactNode;
  className?: string;
}

const statusStyles = {
  pending: 'bg-warning/10 text-warning border-warning/20',
  processing: 'bg-primary/10 text-primary border-primary/20 animate-pulse',
  success: 'bg-success/10 text-success border-success/20',
  error: 'bg-destructive/10 text-destructive border-destructive/20',
  info: 'bg-primary/10 text-primary border-primary/20',
  ai: 'bg-secondary/10 text-secondary border-secondary/20',
};

export function StatusBadge({ status, children, className }: StatusBadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium',
        statusStyles[status],
        className
      )}
    >
      <span
        className={cn(
          'h-1.5 w-1.5 rounded-full',
          status === 'pending' && 'bg-warning',
          status === 'processing' && 'bg-primary animate-pulse',
          status === 'success' && 'bg-success',
          status === 'error' && 'bg-destructive',
          status === 'info' && 'bg-primary',
          status === 'ai' && 'bg-secondary'
        )}
      />
      {children}
    </span>
  );
}
