import { useEffect, useRef, useState } from 'react';
import { db } from '../db.ts';
import { navigate } from '../hooks/useHashRoute.ts';

export function AppBar(): React.JSX.Element {
  const { user } = db.useAuth();
  const { data } = db.useQuery(user ? { $users: { $: { where: { id: user.id } } } } : null);
  const name = (data?.$users?.[0]?.name as string | undefined) ?? '';

  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    function handle(e: PointerEvent): void {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    function handleKeyDown(e: KeyboardEvent): void {
      if (e.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    }
    document.addEventListener('pointerdown', handle);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('pointerdown', handle);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open]);

  return (
    <div className="bg-nf-blue dark:bg-slate-900 text-white sticky top-0 z-10 shadow shrink-0">
      <div className="max-w-4xl mx-auto h-14 flex items-center justify-between px-4">
        <button
          className="font-bold text-base text-white cursor-pointer bg-transparent border-none hover:text-white/80 transition-colors p-0"
          onClick={() => navigate('dashboard')}
        >
          NF Wavemakers
        </button>

        <div ref={menuRef} className="relative flex items-center gap-2">
          {name && (
            <span className="text-sm text-white/80 max-w-32 truncate hidden sm:block">{name}</span>
          )}
          <button
            ref={triggerRef}
            className="flex flex-col justify-center items-center gap-1.5 w-10 h-10 cursor-pointer bg-transparent border-none text-white hover:bg-white/10 rounded-lg transition-colors"
            onClick={() => setOpen((o) => !o)}
            aria-label="Menu"
            aria-expanded={open}
            aria-controls="app-nav-menu"
            aria-haspopup="menu"
          >
            <span className="block w-5 h-0.5 bg-current rounded-full" />
            <span className="block w-5 h-0.5 bg-current rounded-full" />
            <span className="block w-5 h-0.5 bg-current rounded-full" />
          </button>

          {open && (
            <div
              ref={dropdownRef}
              id="app-nav-menu"
              role="menu"
              aria-label="Navigation menu"
              className="absolute right-0 top-full mt-1 bg-white dark:bg-slate-800 rounded-xl shadow-xl border border-slate-200 dark:border-slate-700 min-w-44 overflow-hidden z-20"
              onKeyDown={(e) => {
                const items = Array.from(
                  dropdownRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
                );
                const idx = items.indexOf(document.activeElement as HTMLElement);
                if (e.key === 'ArrowDown') {
                  e.preventDefault();
                  items[(idx + 1) % items.length]?.focus();
                } else if (e.key === 'ArrowUp') {
                  e.preventDefault();
                  items[(idx - 1 + items.length) % items.length]?.focus();
                } else if (e.key === 'Home') {
                  e.preventDefault();
                  items[0]?.focus();
                } else if (e.key === 'End') {
                  e.preventDefault();
                  items[items.length - 1]?.focus();
                }
              }}
            >
              {name && (
                <div className="px-4 py-3 border-b border-slate-100 dark:border-slate-700 sm:hidden">
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                    {name}
                  </p>
                </div>
              )}
              <button
                role="menuitem"
                className="w-full text-left px-4 py-3.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer bg-transparent border-none transition-colors"
                onClick={() => {
                  navigate('profile');
                  setOpen(false);
                }}
              >
                Edit Profile
              </button>
              <button
                role="menuitem"
                className="w-full text-left px-4 py-3.5 text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer bg-transparent border-none transition-colors border-t border-slate-100 dark:border-slate-700"
                onClick={() => db.auth.signOut()}
              >
                Sign Out
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
