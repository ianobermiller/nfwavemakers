import { noClubNoticeWhen } from './noClubNotice.ts';

const TOURNAMENT = 'https://ncfca.org/tournaments/online-fall-speech-practice/';

export function NoClubNotice(): React.JSX.Element | null {
  const when = noClubNoticeWhen();
  if (when === null) return null;

  return (
    <aside
      aria-label="Club announcement"
      className="bg-amber-300 px-5 py-4 text-center text-nf-blue"
    >
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
    </aside>
  );
}
