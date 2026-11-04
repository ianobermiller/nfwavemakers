import type { SelectHTMLAttributes } from 'react';

const DEFAULT_CLASSES =
  'w-full scroll-mt-24 px-3 py-2.5 border-2 border-slate-200 dark:border-slate-700 rounded-lg bg-white dark:bg-slate-800 text-slate-900 dark:text-slate-100 text-base outline-none transition-colors focus:border-nf-accent cursor-pointer font-[inherit]';

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  className?: string;
}

export function Select({ className, ...rest }: Props): React.JSX.Element {
  return <select className={`${DEFAULT_CLASSES} ${className ?? ''}`} {...rest} />;
}
