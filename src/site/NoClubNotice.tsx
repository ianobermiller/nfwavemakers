import { useState } from 'react';
import {
  noClubNoticeWhen,
  readNoClubNoticeDismissed,
  writeNoClubNoticeDismissed,
} from './noClubNotice.ts';

const TOURNAMENT = 'https://ncfca.org/tournaments/online-fall-speech-practice/';

export function NoClubNotice(): React.JSX.Element | null {
  const when = noClubNoticeWhen();
  const [dismissed, setDismissed] = useState(() => readNoClubNoticeDismissed(localStorage));

  if (when === null || dismissed) return null;

  function close(): void {
    try {
      writeNoClubNoticeDismissed(localStorage);
    } catch {
      // Private browsing can reject storage writes. Still hide the note.
    }
    setDismissed(true);
  }

  return (
    <aside aria-label="Club announcement" className="relative bg-amber-300 text-nf-blue">
      <div className="px-14 py-4 text-center">
        <p className="text-xl font-extrabold tracking-tight">
          {when === 'today' ? 'No club today' : 'No club next week'}
        </p>
        <p className="mx-auto mt-1 max-w-2xl text-base leading-relaxed">
          We will not meet on Tuesday, November 10 because of the{' '}
          <a
            href={TOURNAMENT}
            target="_blank"
            rel="noopener noreferrer"
            className="font-semibold underline underline-offset-2 hover:text-nf-blue-mid"
          >
            online speech tournament
          </a>
          {'.'}
        </p>
      </div>
      <button
        type="button"
        aria-label="Dismiss announcement"
        onClick={close}
        className="absolute top-2 right-2 flex h-11 w-11 cursor-pointer items-center justify-center rounded-md border-0 bg-transparent text-2xl leading-none text-nf-blue hover:bg-amber-400/80"
      >
        <span aria-hidden="true">×</span>
      </button>
    </aside>
  );
}
