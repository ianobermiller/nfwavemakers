import { cn } from 'cnfast';
import type { HTMLAttributes, ReactNode } from 'react';

const sizes = {
  sm: 'text-sm text-slate-500 dark:text-slate-400',
  xs: 'text-xs text-slate-400 dark:text-slate-500',
} as const;

export type MutedSize = keyof typeof sizes;

export function mutedClass(size: MutedSize = 'sm', className?: string): string {
  return cn(sizes[size], className);
}

export function Muted({
  as: Tag = 'p',
  size = 'sm',
  className,
  children,
  ...rest
}: {
  as?: 'p' | 'span' | 'div';
  size?: MutedSize;
  className?: string;
  children: ReactNode;
} & Omit<HTMLAttributes<HTMLElement>, 'className' | 'children'>): React.JSX.Element {
  return (
    <Tag className={cn(mutedClass(size), className)} {...rest}>
      {children}
    </Tag>
  );
}
