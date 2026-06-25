import { useEffect, useRef, useState } from 'react';

interface Props {
  value: string[];
  onChange: (ids: string[]) => void;
  judges: Array<{ id: string; name?: string | null }>;
}

export function JudgePicker({ value, onChange, judges }: Props): React.JSX.Element {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function toggle(judgeId: string): void {
    onChange(value.includes(judgeId) ? value.filter((id) => id !== judgeId) : [...value, judgeId]);
  }

  const selectedJudges = judges.filter((j) => value.includes(j.id));

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`w-full min-h-[2.5rem] flex items-center flex-wrap gap-1.5 px-3 py-2 text-left border-2 rounded-xl bg-white dark:bg-slate-900 transition-colors cursor-pointer ${
          open
            ? 'border-nf-blue dark:border-nf-blue-d'
            : 'border-slate-200 dark:border-slate-600 hover:border-slate-300 dark:hover:border-slate-500'
        }`}
      >
        {selectedJudges.length === 0 ? (
          <span className="text-sm text-slate-400 dark:text-slate-500">Select judges…</span>
        ) : (
          selectedJudges.map((j) => (
            <span
              key={j.id}
              className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-nf-blue-light dark:bg-slate-700 text-nf-blue dark:text-nf-blue-d text-xs font-semibold"
            >
              {j.name ?? j.id}
              <span
                role="button"
                aria-label={`Remove ${j.name ?? j.id}`}
                className="cursor-pointer opacity-60 hover:opacity-100"
                onMouseDown={(e) => {
                  e.stopPropagation();
                  toggle(j.id);
                }}
              >
                ×
              </span>
            </span>
          ))
        )}
        <span className="ml-auto text-slate-400 dark:text-slate-500 text-xs shrink-0">▾</span>
      </button>

      {open && (
        <div className="absolute z-30 w-full mt-1 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-xl shadow-lg max-h-52 overflow-y-auto">
          {judges.length === 0 ? (
            <p className="px-3 py-2 text-sm text-slate-400 dark:text-slate-500">
              No parent accounts yet.
            </p>
          ) : (
            judges.map((j) => {
              const selected = value.includes(j.id);
              return (
                <button
                  key={j.id}
                  type="button"
                  className={`w-full text-left px-3 py-2.5 text-sm flex items-center gap-2.5 cursor-pointer border-none transition-colors ${
                    selected
                      ? 'bg-nf-blue-light dark:bg-slate-700 font-semibold text-nf-blue dark:text-nf-blue-d'
                      : 'bg-transparent hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100'
                  }`}
                  onClick={() => toggle(j.id)}
                >
                  <span
                    className={`w-4 h-4 shrink-0 rounded border-2 flex items-center justify-center text-[10px] ${
                      selected
                        ? 'border-nf-blue dark:border-nf-blue-d bg-nf-blue dark:bg-nf-blue-d text-white'
                        : 'border-slate-300 dark:border-slate-500'
                    }`}
                  >
                    {selected && '✓'}
                  </span>
                  {j.name ?? j.id}
                </button>
              );
            })
          )}
        </div>
      )}
    </div>
  );
}
