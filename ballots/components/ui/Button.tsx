import { cn } from 'cnfast';
import { forwardRef, type ButtonHTMLAttributes } from 'react';

type ButtonVariant = 'primary' | 'secondary' | 'neutral' | 'ghost' | 'danger' | 'link' | 'text';
type ButtonSize = 'sm' | 'md' | 'lg';

const sized =
  'inline-flex cursor-pointer items-center justify-center font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-50';

const variants: Record<ButtonVariant, string> = {
  primary: 'border-none bg-nf-blue text-white enabled:hover:bg-nf-blue-mid dark:bg-nf-blue-d',
  secondary:
    'border-2 border-nf-blue bg-transparent text-nf-blue enabled:hover:bg-nf-blue-light dark:border-nf-blue-d dark:text-nf-blue-d enabled:dark:hover:bg-slate-700',
  neutral:
    'border-2 border-slate-200 bg-transparent text-slate-700 enabled:hover:bg-slate-50 dark:border-slate-600 dark:text-slate-200 enabled:dark:hover:bg-slate-700',
  ghost:
    'border-none bg-transparent text-slate-600 enabled:hover:bg-slate-100 dark:text-slate-300 enabled:dark:hover:bg-slate-700',
  danger:
    'shrink-0 border-none bg-transparent px-3 py-1.5 text-xs font-medium text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-200',
  link: 'border-none bg-transparent text-sm text-nf-accent underline disabled:cursor-not-allowed disabled:opacity-50',
  text: 'shrink-0 border-none bg-transparent text-sm font-semibold text-nf-blue hover:underline dark:text-nf-blue-d',
};

const sizes: Record<ButtonSize, string> = {
  sm: 'h-9 rounded-lg px-3 text-sm',
  md: 'rounded-lg px-3 py-2 text-sm',
  lg: 'rounded-xl px-5 py-3',
};

const unsized = new Set<ButtonVariant>(['danger', 'link', 'text']);

interface ClassOptions {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
  className?: string;
}

function buttonClass({
  variant = 'primary',
  size = 'lg',
  fullWidth = false,
  className,
}: ClassOptions): string {
  return cn(
    unsized.has(variant) ? 'inline-flex cursor-pointer items-center transition-colors' : sized,
    variants[variant],
    unsized.has(variant) ? undefined : sizes[size],
    fullWidth && 'w-full',
    className,
  );
}

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', size = 'lg', fullWidth = false, className, type = 'button', ...rest },
  ref,
): React.JSX.Element {
  return (
    <button
      ref={ref}
      type={type}
      className={buttonClass({
        variant,
        size,
        fullWidth,
        ...(className === undefined ? {} : { className }),
      })}
      {...rest}
    />
  );
});
