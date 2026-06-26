import { useEffect, useRef, useState } from 'react';
import { Input } from './ui/Input.tsx';

interface Props {
  id: string;
  value: string;
  onChange: (id: string) => void;
  students: Array<{ id: string; name?: string | null }>;
  disabled?: boolean;
}

export function StudentPicker({
  id: inputId,
  value,
  onChange,
  students,
  disabled,
}: Props): React.JSX.Element {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selected = students.find((s) => s.id === value);
  const displayText = open ? query : (selected?.name ?? selected?.id ?? '');

  const filtered = query.trim()
    ? students.filter((s) => (s.name ?? s.id).toLowerCase().includes(query.toLowerCase()))
    : students;

  useEffect(() => {
    function handleClick(e: MouseEvent): void {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
        setQuery('');
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  return (
    <div ref={containerRef} className="relative">
      <Input
        id={inputId}
        type="text"
        value={displayText}
        placeholder="Search students…"
        autoComplete="off"
        disabled={disabled}
        onChange={(e) => {
          if (disabled) return;
          setQuery(e.target.value);
          setOpen(true);
        }}
        onFocus={() => {
          if (!disabled) setOpen(true);
        }}
        role="combobox"
        aria-expanded={open}
        aria-controls="student-picker-list"
        aria-autocomplete="list"
      />
      {open && (
        <div
          id="student-picker-list"
          role="listbox"
          className="absolute z-30 w-full mt-1 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-48 overflow-y-auto"
        >
          <button
            type="button"
            className="w-full text-left px-3 py-2 text-sm text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer border-none bg-transparent"
            onClick={() => {
              onChange('');
              setOpen(false);
              setQuery('');
            }}
          >
            — None —
          </button>
          {filtered.map((s) => (
            <button
              key={s.id}
              type="button"
              role="option"
              aria-selected={s.id === value}
              className={`w-full text-left px-3 py-2 text-sm cursor-pointer border-none transition-colors ${
                value === s.id
                  ? 'bg-nf-blue-light dark:bg-slate-700 font-semibold text-nf-blue dark:text-nf-blue-d'
                  : 'bg-transparent hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100'
              }`}
              onClick={() => {
                onChange(s.id);
                setOpen(false);
                setQuery('');
              }}
            >
              {s.name ?? s.id}
            </button>
          ))}
          {filtered.length === 0 && (
            <p className="px-3 py-2 text-sm text-slate-400 dark:text-slate-500">
              No students found
            </p>
          )}
        </div>
      )}
    </div>
  );
}
