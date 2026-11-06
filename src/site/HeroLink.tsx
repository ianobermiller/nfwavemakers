import { cn } from 'cnfast';
import type { AnchorHTMLAttributes } from 'react';

interface Props extends AnchorHTMLAttributes<HTMLAnchorElement> {
  variant?: 'solid' | 'outline';
}

export function HeroLink({ variant = 'solid', className, ...rest }: Props): React.JSX.Element {
  return (
    <a
      className={cn(
        'inline-flex items-center justify-center rounded-lg px-6 py-3 text-[0.95rem] font-semibold no-underline hover:no-underline',
        variant === 'solid'
          ? 'bg-nf-accent text-white shadow-md hover:bg-sky-600'
          : 'border-2 border-white/70 text-white hover:border-white hover:bg-white/10',
        className,
      )}
      {...rest}
    />
  );
}
