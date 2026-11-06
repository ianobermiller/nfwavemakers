import { cn } from 'cnfast';
import type { ReactNode } from 'react';

export function FieldError({
  children,
  id,
  className,
}: {
  children: ReactNode;
  id?: string;
  className?: string;
}): React.JSX.Element {
  return (
    <p className={cn('text-sm text-red-600', className)} id={id} role="alert">
      {children}
    </p>
  );
}

export function StatusNote({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <p className={cn('text-sm text-emerald-700 dark:text-emerald-300', className)} role="status">
      {children}
    </p>
  );
}
