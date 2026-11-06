import { Muted } from './ui/Muted.tsx';

interface Props {
  notes: string;
}

export function SpeakerNotes({ notes }: Props): React.JSX.Element {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg px-3 py-2">
      <Muted size="xs" className="mb-1 font-semibold">
        Notes
      </Muted>
      <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{notes}</p>
    </div>
  );
}
