import { cn } from 'cnfast';
import type { ReactNode } from 'react';

export function PageHero({
  title,
  lead,
  leadClassName,
  eyebrow,
  spacious = false,
  children,
}: {
  title: ReactNode;
  lead?: ReactNode;
  leadClassName?: string;
  eyebrow?: ReactNode;
  spacious?: boolean;
  children?: ReactNode;
}): React.JSX.Element {
  return (
    <section
      className={cn(
        'bg-gradient-to-br from-nf-blue to-nf-blue-mid px-5 text-center text-white',
        spacious ? 'py-14 sm:py-20' : 'py-14',
      )}
    >
      {eyebrow}
      <h1
        className={cn(
          'font-extrabold tracking-tight',
          spacious ? 'text-4xl leading-tight sm:text-5xl' : 'text-4xl',
        )}
      >
        {title}
      </h1>
      {lead != null && (
        <p
          className={cn(
            'mx-auto max-w-xl text-sky-100',
            spacious ? 'mt-4 text-base leading-relaxed sm:text-lg' : 'mt-3',
            leadClassName,
          )}
        >
          {lead}
        </p>
      )}
      {children}
    </section>
  );
}
