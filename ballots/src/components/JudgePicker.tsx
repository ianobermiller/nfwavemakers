import { useState } from 'react';
import * as Popover from '@radix-ui/react-popover';
import { cn } from 'cnfast';

interface Props {
  value: string[];
  onChange: (ids: string[]) => void;
  judges: Array<{ id: string; name?: string | null }>;
}

export function JudgePicker({ value, onChange, judges }: Props): React.JSX.Element {
  const [open, setOpen] = useState(false);

  function toggleJudge(judgeId: string): void {
    onChange(value.includes(judgeId) ? value.filter((id) => id !== judgeId) : [...value, judgeId]);
  }

  function removeJudge(e: React.MouseEvent, judgeId: string): void {
    e.stopPropagation();
    onChange(value.filter((id) => id !== judgeId));
  }

  const selectedJudges = judges.filter((j) => value.includes(j.id));

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-haspopup="listbox"
          aria-expanded={open}
          className="w-full min-h-[2.5rem] flex flex-wrap gap-1.5 items-center px-3 py-2 border-2 border-slate-200 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-800 text-left cursor-pointer hover:border-nf-blue dark:hover:border-nf-blue-d transition-colors focus:outline-none focus:border-nf-blue dark:focus:border-nf-blue-d"
        >
          {selectedJudges.length === 0 ? (
            <span className="text-sm text-slate-400 dark:text-slate-500">Select judges…</span>
          ) : (
            selectedJudges.map((j) => (
              <span
                key={j.id}
                className="inline-flex items-center gap-1 px-2 py-0.5 bg-nf-blue-light dark:bg-slate-700 text-nf-blue dark:text-nf-blue-d text-xs font-semibold rounded-md"
              >
                {j.name ?? j.id}
                <button
                  type="button"
                  tabIndex={0}
                  aria-label={`Remove ${j.name ?? j.id}`}
                  className="ml-0.5 text-nf-blue dark:text-nf-blue-d hover:text-nf-accent focus:outline-none cursor-pointer bg-transparent border-none p-0 leading-none"
                  onClick={(e) => removeJudge(e, j.id)}
                >
                  ×
                </button>
              </span>
            ))
          )}
        </button>
      </Popover.Trigger>

      <Popover.Portal>
        <Popover.Content
          className="z-50 w-[var(--radix-popover-trigger-width)] bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          sideOffset={4}
          align="start"
        >
          <div role="listbox" aria-multiselectable="true" aria-label="Select judges">
            {judges.length === 0 ? (
              <p className="px-3 py-2 text-sm text-slate-400 dark:text-slate-500">
                No judges available
              </p>
            ) : (
              judges.map((j) => {
                const selected = value.includes(j.id);
                return (
                  <button
                    key={j.id}
                    type="button"
                    role="option"
                    aria-selected={selected}
                    className={cn(
                      'w-full text-left px-3 py-2.5 text-sm flex items-center gap-2.5 cursor-pointer border-none transition-colors',
                      selected
                        ? 'bg-nf-blue-light dark:bg-slate-700 font-semibold text-nf-blue dark:text-nf-blue-d'
                        : 'bg-transparent hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100',
                    )}
                    onClick={() => toggleJudge(j.id)}
                  >
                    <span
                      className={cn(
                        'w-4 h-4 shrink-0 rounded border-2 flex items-center justify-center text-white text-xs',
                        selected
                          ? 'bg-nf-blue dark:bg-nf-blue-d border-nf-blue dark:border-nf-blue-d'
                          : 'border-slate-300 dark:border-slate-500',
                      )}
                    >
                      {selected && '✓'}
                    </span>
                    {j.name ?? j.id}
                  </button>
                );
              })
            )}
          </div>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
