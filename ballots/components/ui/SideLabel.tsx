import { cn } from 'cnfast';
import type { ReactNode } from 'react';

export function SideLabel({
  side,
  as: Tag = 'h2',
  className,
  children,
}: {
  side: 'aff' | 'neg';
  as?: 'h2' | 'h3' | 'div';
  className?: string;
  children: ReactNode;
}): React.JSX.Element {
  return (
    <Tag
      className={cn(
        'mb-2 rounded-lg px-3 py-1.5 text-xs font-bold tracking-wider uppercase',
        side === 'aff'
          ? 'bg-aff-bg text-aff dark:bg-aff-bg-d dark:text-aff-d'
          : 'bg-neg-bg text-neg dark:bg-neg-bg-d dark:text-neg-d',
        className,
      )}
    >
      {children}
    </Tag>
  );
}
