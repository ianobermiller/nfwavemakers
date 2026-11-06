import { cn } from 'cnfast';
import type { ReactNode } from 'react';

const variants = {
  page: 'text-lg font-bold text-slate-800 dark:text-slate-100',
  section: 'text-base font-bold text-slate-700 dark:text-slate-300',
  card: 'text-base font-bold text-slate-800 dark:text-slate-100',
  name: 'text-sm font-semibold text-slate-800 dark:text-slate-100',
  label: 'font-semibold text-slate-800 dark:text-slate-100',
  eyebrow: 'text-xs font-bold tracking-wider text-slate-500 uppercase dark:text-slate-400',
} as const;

const margin: Record<keyof typeof variants, string> = {
  page: '',
  section: 'mb-3',
  card: 'mb-1',
  name: '',
  label: '',
  eyebrow: '',
};

type Variant = keyof typeof variants;
type Tag = 'h1' | 'h2' | 'h3' | 'p' | 'span';

const defaultTag: Record<Variant, Tag> = {
  page: 'h1',
  section: 'h2',
  card: 'h2',
  name: 'span',
  label: 'h2',
  eyebrow: 'h3',
};

export function headingClass(variant: Variant = 'section', className?: string): string {
  return cn(variants[variant], className);
}

export function Heading({
  as,
  variant = 'section',
  className,
  children,
}: {
  as?: Tag;
  variant?: Variant;
  className?: string;
  children: ReactNode;
}): React.JSX.Element {
  const Tag = as ?? defaultTag[variant];
  return <Tag className={headingClass(variant, cn(margin[variant], className))}>{children}</Tag>;
}
