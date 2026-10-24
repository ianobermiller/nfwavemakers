import { useEffect, useRef, useState } from 'react';
import { cn } from 'cnfast';
import { Input } from './ui/Input.tsx';
import { Avatar } from './Avatar.tsx';

interface Props {
  id: string;
  value: string;
  onChange: (id: string) => void;
  students: { id: string; name?: string | undefined }[];
  avatarURLs?: Record<string, string>;
  disabled?: boolean;
}

export function StudentPicker({
  id: inputId,
  value,
  onChange,
  students,
  avatarURLs,
  disabled,
}: Props): React.JSX.Element {
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const [focusedIndex, setFocusedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const optionRefs = useRef<(HTMLButtonElement | null)[]>([]);

  const selected = students.find((s) => s.id === value);
  const displayText = open ? query : (selected?.name ?? selected?.id ?? '');
  const showAvatar = !open && selected !== undefined;

  // "None" option is index 0; filtered items start at index 1
  const filtered = query.trim()
    ? students.filter((s) => (s.name ?? s.id).toLowerCase().includes(query.toLowerCase()))
    : students;

  // Total options = 1 (None) + filtered.length
  const totalOptions = 1 + filtered.length;

  useEffect(() => {
    function handleClick(e: MouseEvent): void {
      const target = e.target;
      if (!(target instanceof Node) || !containerRef.current?.contains(target)) {
        setOpen(false);
        setQuery('');
        setFocusedIndex(-1);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>): void {
    if (!open) {
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        setOpen(true);
        setFocusedIndex(0);
        e.preventDefault();
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const next = focusedIndex < totalOptions - 1 ? focusedIndex + 1 : 0;
      setFocusedIndex(next);
      optionRefs.current[next]?.focus();
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const prev = focusedIndex > 0 ? focusedIndex - 1 : totalOptions - 1;
      setFocusedIndex(prev);
      optionRefs.current[prev]?.focus();
    } else if (e.key === 'Escape') {
      setOpen(false);
      setQuery('');
      setFocusedIndex(-1);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      {showAvatar && (
        <div className="absolute left-2 top-1/2 -translate-y-1/2 pointer-events-none">
          <Avatar
            name={selected.name ?? selected.id}
            imageURL={avatarURLs?.[selected.id]}
            size="sm"
          />
        </div>
      )}
      <Input
        id={inputId}
        type="text"
        role="combobox"
        aria-expanded={open}
        aria-autocomplete="list"
        aria-haspopup="listbox"
        value={displayText}
        placeholder="Search students…"
        autoComplete="off"
        disabled={disabled}
        className={cn(showAvatar && 'pl-12')}
        onChange={(e) => {
          if (disabled) return;
          setQuery(e.target.value);
          setOpen(true);
          setFocusedIndex(-1);
        }}
        aria-controls={open ? `${inputId}-list` : undefined}
        onFocus={() => {
          if (!disabled) setOpen(true);
        }}
        onKeyDown={handleKeyDown}
      />
      {open && (
        <div
          id={`${inputId}-list`}
          role="listbox"
          aria-label="Students"
          className="absolute z-30 w-full mt-1 bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-48 overflow-y-auto"
        >
          <button
            type="button"
            role="option"
            aria-selected={value === ''}
            ref={(el) => {
              optionRefs.current[0] = el;
            }}
            className={cn(
              'w-full text-left px-3 py-2 text-sm cursor-pointer border-none transition-colors text-slate-400',
              focusedIndex === 0
                ? 'bg-slate-100 dark:bg-slate-700'
                : 'bg-transparent hover:bg-slate-50 dark:hover:bg-slate-700',
            )}
            onKeyDown={(e) => {
              if (e.key === 'ArrowDown') {
                e.preventDefault();
                const next = 1 < totalOptions ? 1 : 0;
                setFocusedIndex(next);
                optionRefs.current[next]?.focus();
              } else if (e.key === 'ArrowUp') {
                e.preventDefault();
                const prev = totalOptions - 1;
                setFocusedIndex(prev);
                optionRefs.current[prev]?.focus();
              } else if (e.key === 'Escape') {
                setOpen(false);
                setQuery('');
                setFocusedIndex(-1);
              }
            }}
            onClick={() => {
              onChange('');
              setOpen(false);
              setQuery('');
              setFocusedIndex(-1);
            }}
          >
            — None —
          </button>
          {filtered.map((s, i) => (
            <button
              key={s.id}
              type="button"
              role="option"
              aria-selected={s.id === value}
              ref={(el) => {
                optionRefs.current[i + 1] = el;
              }}
              className={cn(
                'w-full text-left px-3 py-2 text-sm cursor-pointer border-none transition-colors flex items-center gap-2',
                value === s.id
                  ? 'bg-nf-blue-light dark:bg-slate-700 font-semibold text-nf-blue dark:text-nf-blue-d'
                  : 'bg-transparent hover:bg-slate-50 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-100',
                focusedIndex === i + 1 && 'ring-2 ring-inset ring-nf-blue dark:ring-nf-blue-d',
              )}
              onKeyDown={(e) => {
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  const next = i + 1 < totalOptions - 1 ? i + 2 : 0;
                  setFocusedIndex(next);
                  optionRefs.current[next]?.focus();
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  const prev = i + 1 > 0 ? i : totalOptions - 1;
                  setFocusedIndex(prev);
                  optionRefs.current[prev]?.focus();
                } else if (e.key === 'Escape') {
                  setOpen(false);
                  setQuery('');
                  setFocusedIndex(-1);
                }
              }}
              onClick={() => {
                onChange(s.id);
                setOpen(false);
                setQuery('');
                setFocusedIndex(-1);
              }}
            >
              <Avatar name={s.name ?? s.id} imageURL={avatarURLs?.[s.id]} size="sm" />
              <span className="truncate">{s.name ?? s.id}</span>
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
