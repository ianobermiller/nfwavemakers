import { cn } from 'cnfast';
import type { ButtonHTMLAttributes } from 'react';

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  pressed: boolean;
}

export function ChoiceButton({
  pressed,
  className,
  type = 'button',
  ...rest
}: Props): React.JSX.Element {
  return (
    <button
      type={type}
      aria-pressed={pressed}
      className={cn(
        'cursor-pointer rounded-xl border-2 px-4 py-3 text-left transition-colors',
        pressed
          ? 'border-nf-blue bg-nf-blue-light dark:border-nf-blue-d dark:bg-slate-700'
          : 'border-slate-200 hover:border-slate-300 dark:border-slate-600 dark:hover:border-slate-500',
        className,
      )}
      {...rest}
    />
  );
}
