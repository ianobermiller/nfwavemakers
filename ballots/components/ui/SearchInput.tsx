import { useRef, type ComponentProps } from 'react';
import { Input } from './Input.tsx';

type Props = Omit<ComponentProps<typeof Input>, 'type' | 'value' | 'onChange'> & {
  value: string;
  onValueChange: (value: string) => void;
};

export function SearchInput({
  value,
  onValueChange,
  className,
  ...rest
}: Props): React.JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div ref={containerRef} className="relative">
      <Input
        {...rest}
        type="search"
        value={value}
        onChange={(event) => onValueChange(event.target.value)}
        className={`min-h-11 pr-12 [&::-webkit-search-cancel-button]:appearance-none ${className ?? ''}`}
      />
      {value.length > 0 && (
        <button
          type="button"
          aria-label="Clear search"
          className="absolute right-0 top-1/2 flex h-11 w-11 -translate-y-1/2 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:text-slate-900 focus-visible:outline-2 focus-visible:outline-nf-accent dark:text-slate-400 dark:hover:text-slate-100"
          onClick={() => {
            onValueChange('');
            containerRef.current?.querySelector('input')?.focus();
          }}
        >
          <svg aria-hidden="true" width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path
              d="m4 4 8 8M12 4l-8 8"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        </button>
      )}
    </div>
  );
}
