import {
  POSITION_LABELS,
  SCORE_CATEGORIES,
  type Position,
  type SpeakerFormState,
} from '../types.ts';
import { scoringTotal } from '../utils.ts';
import { AutoTextarea } from './AutoTextarea.tsx';
import { StudentPicker } from './StudentPicker.tsx';
import { Select } from './ui/Select.tsx';

interface ScoreRowProps {
  label: string;
  name: string;
  value: number | undefined;
  onChange: (v: number) => void;
  onLabelClick: () => void;
}

function ScoreRow({
  label,
  name,
  value,
  onChange,
  onLabelClick,
}: ScoreRowProps): React.JSX.Element {
  return (
    <div className="flex items-center justify-between gap-2">
      <button
        type="button"
        onClick={onLabelClick}
        className="text-xs font-semibold text-slate-500 dark:text-slate-400 shrink-0 cursor-pointer bg-transparent border-none p-0 text-left hover:text-nf-accent dark:hover:text-nf-accent transition-colors"
      >
        {label}
      </button>
      <div className="flex gap-1" role="radiogroup" aria-label={label}>
        {[1, 2, 3, 4, 5].map((n) => (
          <label key={n} className={`score-btn ${value === n ? 'active' : ''}`}>
            <input
              className="sr-only"
              type="radio"
              name={`${name}-${n}`}
              value={n}
              checked={value === n}
              onChange={() => onChange(n)}
            />
            {n}
          </label>
        ))}
      </div>
    </div>
  );
}

interface Props {
  pos: Position;
  speaker: SpeakerFormState;
  students: Array<{ id: string; name?: string | null }>;
  activeCount: number;
  currentRank: number;
  locked?: boolean;
  onUpdate: (patch: Partial<SpeakerFormState>) => void;
  onRank: (rank: number) => void;
  onGuideOpen: (category: string) => void;
}

export function SpeakerEvalCard({
  pos,
  speaker,
  students,
  activeCount,
  currentRank,
  locked,
  onUpdate,
  onRank,
  onGuideOpen,
}: Props): React.JSX.Element {
  const hasUser = speaker.userId !== '';
  const total = scoringTotal(speaker);

  return (
    <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 mb-3 flex flex-col gap-2">
      <div className="flex items-center justify-between gap-2">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          {POSITION_LABELS[pos]}
        </h3>
        <span
          className={`text-sm font-bold text-nf-blue dark:text-nf-blue-d transition-opacity ${total > 0 ? 'opacity-100' : 'opacity-0'}`}
        >
          {total > 0 ? total : '0'}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="flex-1 min-w-0">
          <StudentPicker
            id={`speaker-${pos}`}
            value={speaker.userId}
            onChange={(uid) => onUpdate({ userId: uid })}
            students={students}
            disabled={locked}
          />
        </div>
        {hasUser && (
          <div className="flex items-center gap-1 shrink-0">
            <span className="text-xs text-slate-400 dark:text-slate-500">Rank</span>
            <Select
              style={{ width: 'auto' }}
              className="text-xs py-1 px-1.5"
              aria-label={'Rank for ' + POSITION_LABELS[pos]}
              value={currentRank || ''}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                if (!isNaN(n)) onRank(n);
              }}
            >
              <option value="">—</option>
              {Array.from({ length: activeCount }, (_, i) => i + 1).map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Select>
          </div>
        )}
      </div>
      {hasUser && (
        <>
          <div className="flex flex-col gap-1.5">
            {SCORE_CATEGORIES.map((cat) => (
              <ScoreRow
                key={cat.key}
                name={`${pos}-${cat.key}`}
                label={cat.label}
                value={speaker[cat.key]}
                onChange={(v) => onUpdate({ [cat.key]: v })}
                onLabelClick={() => onGuideOpen(cat.label)}
              />
            ))}
          </div>
          <AutoTextarea
            value={speaker.notes}
            onChange={(v) => onUpdate({ notes: v })}
            placeholder="Notes…"
          />
        </>
      )}
    </div>
  );
}
