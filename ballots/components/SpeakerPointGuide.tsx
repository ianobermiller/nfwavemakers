import * as Dialog from '@radix-ui/react-dialog';
import { useEffect, useState } from 'react';
import { cn } from 'cnfast';
import { SPEAKER_GUIDE_ROWS } from '../types.ts';

/** Matches Tailwind's `md` breakpoint, where the guide is a side panel. */
const DESKTOP_GUIDE_QUERY = '(min-width: 48rem)';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  focusCategory?: string | undefined;
}

function useDesktopGuide(): boolean {
  const [desktop, setDesktop] = useState(() => window.matchMedia(DESKTOP_GUIDE_QUERY).matches);

  useEffect(() => {
    const media = window.matchMedia(DESKTOP_GUIDE_QUERY);
    const update = () => setDesktop(media.matches);
    update();
    media.addEventListener('change', update);
    return () => media.removeEventListener('change', update);
  }, []);

  return desktop;
}

export function SpeakerPointGuide({ isOpen, onClose, focusCategory }: Props): React.JSX.Element {
  const desktop = useDesktopGuide();
  const initialOpenIndex =
    focusCategory !== undefined
      ? SPEAKER_GUIDE_ROWS.findIndex((r) => r.category === focusCategory)
      : 0;

  const [openIndex, setOpenIndex] = useState<number | null>(
    initialOpenIndex !== -1 ? initialOpenIndex : 0,
  );

  function toggle(i: number): void {
    setOpenIndex((prev) => (prev === i ? null : i));
  }

  return (
    <Dialog.Root
      modal={!desktop}
      open={isOpen}
      onOpenChange={(o) => {
        if (!o) onClose();
      }}
    >
      <Dialog.Portal>
        {/* Phone sheet scrim. Desktop is non-modal, so Radix does not mount this. */}
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/40" />

        <Dialog.Content
          className="fixed z-50 inset-x-0 bottom-0 md:inset-y-0 md:inset-x-auto md:right-0 md:w-96
                     bg-white dark:bg-slate-800 shadow-2xl flex flex-col
                     rounded-t-2xl md:rounded-none max-h-[85vh] md:max-h-none
                     focus:outline-none"
          onInteractOutside={(event) => {
            // Desktop is a side panel: scrolling or using the ballot should not close it.
            if (desktop) event.preventDefault();
          }}
        >
          {/* Drag handle (mobile only) */}
          <div className="flex justify-center py-2.5 md:hidden shrink-0">
            <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-600" />
          </div>

          {/* Header */}
          <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-700 shrink-0 sticky top-0 bg-white dark:bg-slate-800 z-10">
            <div>
              <Dialog.Title className="font-bold text-sm text-slate-900 dark:text-slate-100">
                Speaker Point Guide
              </Dialog.Title>
              <Dialog.Description className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
                NCFCA Debate · 1 Beginning → 5 Excellent
              </Dialog.Description>
            </div>
            <Dialog.Close
              className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors cursor-pointer bg-transparent border-none"
              aria-label="Close guide"
            >
              ✕
            </Dialog.Close>
          </div>

          {/* Accordion content */}
          <div className="overflow-y-auto flex-1">
            {SPEAKER_GUIDE_ROWS.map((row, i) => {
              const isExpanded = openIndex === i;
              return (
                <div
                  key={row.category}
                  className="border-b border-slate-100 dark:border-slate-700 last:border-b-0"
                >
                  <button
                    type="button"
                    onClick={() => toggle(i)}
                    className="w-full flex items-center justify-between px-5 py-3.5 text-left cursor-pointer bg-transparent border-none hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                  >
                    <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
                      {row.category}
                    </span>
                    <span
                      className={cn(
                        'text-slate-400 dark:text-slate-500 text-xs transition-transform duration-200',
                        isExpanded && 'rotate-180',
                      )}
                    >
                      ▾
                    </span>
                  </button>
                  {isExpanded && (
                    <div className="px-5 pb-4 flex flex-col gap-3">
                      {row.scores.map((desc, j) => (
                        <div key={desc} className="flex gap-2.5 items-start">
                          <span className="shrink-0 w-5 h-5 rounded-full bg-slate-100 dark:bg-slate-700 text-slate-500 dark:text-slate-400 text-xs font-bold flex items-center justify-center mt-0.5">
                            {j + 1}
                          </span>
                          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">
                            {desc}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
