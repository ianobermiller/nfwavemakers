import { useEffect, useRef, useState, type ReactNode } from 'react';
import { cn } from 'cnfast';
import { signOut } from '../../ballots/data/auth.ts';
import { useAppUser, useAuthState } from '../../ballots/hooks/auth.tsx';
import { navigate } from '../hooks/useHashRoute.ts';
import { Avatar } from '../../ballots/components/Avatar.tsx';

type NavPage = 'home' | 'about' | 'schedule' | 'lessons' | 'ballots' | 'join';

interface Props {
  children: ReactNode;
  current?: NavPage;
}

const NAV: { path: string; label: string; page: NavPage; cta?: boolean }[] = [
  { path: 'about', label: 'About', page: 'about' },
  { path: 'schedule', label: 'Schedule', page: 'schedule' },
  { path: 'lessons', label: 'Lessons', page: 'lessons' },
  { path: 'ballots', label: 'Ballots', page: 'ballots' },
  { path: 'join', label: 'Join Us', page: 'join', cta: true },
];

export function SiteLayout({ children, current }: Props): React.JSX.Element {
  const { user, isLoading } = useAuthState();
  const signedIn = user !== undefined || isLoading;
  const nav = NAV.filter((item) => item.page !== 'join' || !signedIn);
  const [navOpen, setNavOpen] = useState(false);

  function closeNav(): void {
    setNavOpen(false);
  }

  function go(path: string): void {
    closeNav();
    navigate(path);
  }

  return (
    <div className="min-h-dvh bg-slate-50 text-slate-800 dark:bg-slate-950 dark:text-slate-100">
      <header className="sticky top-0 z-50 bg-nf-blue text-white shadow-md">
        <div className="mx-auto flex h-16 max-w-5xl items-center justify-between gap-4 px-5">
          <a
            className="flex shrink-0 items-center gap-2.5 text-white no-underline hover:no-underline"
            href="/"
            onClick={(event) => {
              event.preventDefault();
              go('');
            }}
          >
            <img src="/images/logo.svg" alt="" className="h-10 w-auto brightness-0 invert" />
            <div>
              <div className="text-[0.95rem] leading-tight font-bold">North Florida Wavemakers</div>
              <div className="text-[0.7rem] font-medium tracking-wider text-sky-200/80 uppercase">
                Speech &amp; Debate Club
              </div>
            </div>
          </a>
          <div className="flex items-center gap-1">
            <nav
              className={cn(
                'absolute inset-x-0 top-16 flex-col gap-1 bg-nf-blue px-5 py-3 shadow-lg md:static md:flex md:flex-row md:items-center md:gap-1 md:bg-transparent md:p-0 md:shadow-none',
                navOpen ? 'flex' : 'hidden md:flex',
              )}
            >
              {nav.map((item) => (
                <a
                  key={item.path}
                  href={`/${item.path}`}
                  aria-current={current === item.page ? 'page' : undefined}
                  className={cn(
                    'rounded-md px-2.5 py-2 text-sm font-medium text-sky-100 no-underline hover:bg-white/10 hover:text-white hover:no-underline',
                    current === item.page && 'bg-white/15 text-white',
                    item.cta && 'bg-nf-accent text-center text-white hover:bg-sky-600 md:ml-2',
                  )}
                  onClick={(event) => {
                    event.preventDefault();
                    go(item.path);
                  }}
                >
                  {item.label}
                </a>
              ))}
            </nav>
            {user && <AccountMenu />}
            <button
              className="flex flex-col gap-1.5 p-2 md:hidden"
              aria-label="Toggle navigation"
              aria-expanded={navOpen}
              type="button"
              onClick={() => setNavOpen((open) => !open)}
            >
              <span className="block h-0.5 w-6 rounded bg-white" />
              <span className="block h-0.5 w-6 rounded bg-white" />
              <span className="block h-0.5 w-6 rounded bg-white" />
            </button>
          </div>
        </div>
      </header>

      <main>{children}</main>

      <footer className="bg-[#080f1a] px-5 py-6 text-center text-sm leading-relaxed text-slate-500">
        <p>North Florida Wavemakers — NCFCA Speech &amp; Debate — St. Johns County, FL</p>
        <p>
          Affiliated with{' '}
          <a
            href="https://www.ncfca.org"
            target="_blank"
            rel="noopener noreferrer"
            className="text-slate-400 underline-offset-2 hover:text-sky-200 hover:underline"
          >
            NCFCA
          </a>
        </p>
        <p className="text-xs text-slate-600">
          Website questions:{' '}
          <a
            href="mailto:web@nfwavemakers.com"
            className="text-slate-400 underline-offset-2 hover:text-sky-200 hover:underline"
          >
            web@nfwavemakers.com
          </a>
        </p>
      </footer>
    </div>
  );
}

function AccountMenu(): React.JSX.Element {
  const user = useAppUser();
  const name = user?.name ?? '';
  const imageURL = user?.avatarUrl ?? undefined;
  const [open, setOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return undefined;
    function handle(event: PointerEvent): void {
      const target = event.target;
      if (!(target instanceof Node) || !menuRef.current?.contains(target)) setOpen(false);
    }
    function handleKeyDown(event: KeyboardEvent): void {
      if (event.key === 'Escape') {
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
    <div ref={menuRef} className="relative flex items-center">
      <button
        ref={triggerRef}
        className="cursor-pointer rounded-full border-2 border-transparent hover:border-white/40"
        onClick={() => setOpen((isOpen) => !isOpen)}
        aria-label="Menu"
        aria-expanded={open}
        aria-controls="app-nav-menu"
        aria-haspopup="menu"
        type="button"
      >
        {name ? (
          <Avatar name={name} imageURL={imageURL} size="sm" />
        ) : (
          <span className="flex h-8 w-8 flex-col items-center justify-center gap-1.5">
            <span className="block h-0.5 w-5 rounded-full bg-white" />
            <span className="block h-0.5 w-5 rounded-full bg-white" />
            <span className="block h-0.5 w-5 rounded-full bg-white" />
          </span>
        )}
      </button>
      {open && (
        <div
          ref={dropdownRef}
          id="app-nav-menu"
          role="menu"
          aria-label="Account menu"
          className="absolute top-full right-0 z-20 mt-1 min-w-44 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-800"
          onKeyDown={(event) => {
            const items = Array.from(
              dropdownRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]') ?? [],
            );
            const active = document.activeElement;
            const index = active instanceof HTMLElement ? items.indexOf(active) : -1;
            if (event.key === 'ArrowDown') {
              event.preventDefault();
              items[(index + 1) % items.length]?.focus();
            } else if (event.key === 'ArrowUp') {
              event.preventDefault();
              items[(index - 1 + items.length) % items.length]?.focus();
            } else if (event.key === 'Home') {
              event.preventDefault();
              items[0]?.focus();
            } else if (event.key === 'End') {
              event.preventDefault();
              items[items.length - 1]?.focus();
            }
          }}
        >
          {name && (
            <div className="border-b border-slate-100 px-4 py-3 sm:hidden dark:border-slate-700">
              <p className="truncate text-sm font-semibold text-slate-800 dark:text-slate-100">
                {name}
              </p>
            </div>
          )}
          <button
            role="menuitem"
            className="w-full cursor-pointer border-none bg-transparent px-4 py-3.5 text-left text-sm text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-700"
            type="button"
            onClick={() => {
              navigate('profile');
              setOpen(false);
            }}
          >
            Edit Profile
          </button>
          <button
            role="menuitem"
            className="w-full cursor-pointer border-t border-none border-slate-100 bg-transparent px-4 py-3.5 text-left text-sm text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-700"
            type="button"
            onClick={signOut}
          >
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
}
