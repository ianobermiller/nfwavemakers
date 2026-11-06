import { cn } from 'cnfast';
import type { ButtonHTMLAttributes, HTMLAttributes, ReactNode } from 'react';

export const cardSurface =
  'border border-slate-200 bg-white dark:border-slate-700 dark:bg-slate-800';

export function dialogClass(className?: string): string {
  return cn(
    cardSurface,
    'fixed top-1/2 left-1/2 z-50 flex w-[min(32rem,calc(100%-2rem))] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 rounded-2xl p-5 shadow-xl',
    className,
  );
}

type Tone = 'default' | 'inset' | 'muted';
type Padding = 'none' | 'sm' | 'md' | 'lg';

const tones: Record<Tone, string> = {
  default: cn(cardSurface, 'rounded-xl'),
  inset: 'rounded-lg border border-slate-100 bg-slate-50 dark:border-slate-700 dark:bg-slate-900',
  muted:
    'rounded-xl border border-slate-200 bg-slate-50 text-sm text-slate-500 dark:border-slate-700 dark:bg-slate-800/50 dark:text-slate-400',
};

const paddingClass: Record<Padding, string> = {
  none: '',
  sm: 'px-4 py-3',
  md: 'p-5',
  lg: 'p-6',
};

const interactiveClass =
  'cursor-pointer text-left transition-all hover:border-nf-accent hover:shadow-sm';

interface Common {
  tone?: Tone;
  padding?: Padding;
  interactive?: boolean;
  className?: string;
  children?: ReactNode;
}

type DivProps = Common & { as?: 'div' } & Omit<
    HTMLAttributes<HTMLDivElement>,
    'className' | 'children'
  >;
type ButtonProps = Common & { as: 'button' } & Omit<
    ButtonHTMLAttributes<HTMLButtonElement>,
    'className' | 'children'
  >;

function classesFor(props: Common): string {
  return cn(
    tones[props.tone ?? 'default'],
    paddingClass[props.padding ?? 'none'],
    props.interactive && interactiveClass,
    props.className,
  );
}

function isButtonCard(props: DivProps | ButtonProps): props is ButtonProps {
  return props.as === 'button';
}

export function Card(props: DivProps | ButtonProps): React.JSX.Element {
  const classes = classesFor(props);
  if (isButtonCard(props)) {
    const { as, tone, padding, interactive, className, children, ...rest } = props;
    void as;
    void tone;
    void padding;
    void interactive;
    void className;
    return (
      <button className={classes} type="button" {...rest}>
        {children}
      </button>
    );
  }
  const { as, tone, padding, interactive, className, children, ...rest } = props;
  void as;
  void tone;
  void padding;
  void interactive;
  void className;
  return (
    <div className={classes} {...rest}>
      {children}
    </div>
  );
}
