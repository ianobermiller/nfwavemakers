interface Props {
  notes: string;
}

export function SpeakerNotes({ notes }: Props): React.JSX.Element {
  return (
    <div className="bg-white dark:bg-slate-800 rounded-lg px-3 py-2">
      <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-1">Notes</p>
      <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{notes}</p>
    </div>
  );
}
