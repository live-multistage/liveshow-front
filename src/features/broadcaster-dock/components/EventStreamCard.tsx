'use client';

import { Badge } from '@/shared/components/ui/badge';
import { Card } from '@/shared/components/ui/card';
import { cn } from '@/shared/components/ui/utils';

interface StatusBadge {
  label: string;
  variant: 'live' | 'default';
}

interface EventStreamCardProps {
  title: string;
  thumbnailUrl?: string | null;
  statusBadge?: StatusBadge;
  onClick?: () => void;
  active?: boolean;
  disabled?: boolean;
}

export function EventStreamCard({ title, thumbnailUrl, statusBadge, onClick, active, disabled }: EventStreamCardProps) {
  const inner = (
    <div className="flex items-center gap-3 p-3">
      {thumbnailUrl && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={thumbnailUrl} alt="" className="h-10 w-10 shrink-0 rounded-md object-cover" />
      )}
      <span className="flex-1 truncate text-sm font-medium">{title}</span>
      {statusBadge && (
        <Badge variant={statusBadge.variant === 'live' ? 'destructive' : 'secondary'} className="shrink-0">
          {statusBadge.variant === 'live' && (
            <span className="mr-1 inline-block h-1.5 w-1.5 rounded-full bg-current animate-pulse" />
          )}
          {statusBadge.label}
        </Badge>
      )}
    </div>
  );

  return (
    <Card className={cn('overflow-hidden p-0', active && 'border-primary')}>
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          disabled={disabled}
          className="w-full text-left transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-50"
        >
          {inner}
        </button>
      ) : (
        inner
      )}
    </Card>
  );
}
