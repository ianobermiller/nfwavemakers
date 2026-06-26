import { useState } from 'react';
import { navigate } from '../hooks/useHashRoute.ts';
import { useBallotDraft } from '../hooks/useBallotDraft.ts';
import { AutoTextarea } from './AutoTextarea.tsx';
import { PageLayout } from './PageLayout.tsx';
import { SpeakerEvalCard } from './SpeakerEvalCard.tsx';
import { SpeakerPointGuide } from './SpeakerPointGuide.tsx';
import type { Winner } from '../types.ts';

interface Props {
  debateId?: string;
  judgeId: string;
  judgeName: string;
}

export function BallotForm({ debateId, judgeId, judgeName: _judgeName }: Props): React.JSX.Element {
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideCategory, setGuideCategory] = useState<string | undefined>(undefined);

  const draft = useBallotDraft({ debateId, judgeId });

  return (
    <>
      <PageLayout>
        <div className="flex items-center justify-between mb-3">
          <button
            className="text-sm text-nf-blue dark:text-nf-blue-d font-medium cursor-pointer bg-transparent border-none p-0 hover:underline"
            onClick={() => navigate('dashboard')}
          >
            ← Dashboard
          </button>
          <button
            type="button"
            className="text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1 cursor-pointer bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            onClick={() => setGuideOpen((o) => !o)}
          >
            Speaker Guide
          </button>
        </div>
        {draft.debate && (
          <div className="flex items-center gap-3 text-xs text-slate-500 dark:text-slate-400 mb-3">
            <span>{draft.debate.date}</span>
            <span>·</span>
            <span>Room {draft.debate.room}</span>
            {draft.debate.resolution && (
              <>
                <span>·</span>
                <span className="truncate">{draft.debate.resolution}</span>
              </>
            )}
          </div>
        )}

        {/* Decision */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 mb-4">
          <fieldset className="border-none p-0 m-0">
            <legend className="sr-only">Decision</legend>
            <div className="flex items-center gap-3 flex-wrap">
              {(['aff', 'neg'] as const).map((side) => (
                <label
                  key={side}
                  className={`inline-flex items-center gap-2 px-4 py-2 border-2 rounded-xl cursor-pointer font-semibold text-sm transition-colors ${
                    draft.winner === side
                      ? side === 'aff'
                        ? 'border-aff bg-aff-bg dark:border-aff-d dark:bg-aff-bg-d text-aff dark:text-aff-d'
                        : 'border-neg bg-neg-bg dark:border-neg-d dark:bg-neg-bg-d text-neg dark:text-neg-d'
                      : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-300'
                  }`}
                >
                  <input
                    className="sr-only"
                    type="radio"
                    name="winner"
                    value={side}
                    checked={draft.winner === side}
                    onChange={() => draft.updateWinner(side as Winner)}
                  />
                  {side === 'aff' ? 'Affirmative wins' : 'Negative wins'}
                </label>
              ))}
            </div>
            <div className="mt-3">
              <AutoTextarea
                value={draft.rfd}
                onChange={draft.updateRfd}
                placeholder="Reason for decision…"
              />
            </div>
          </fieldset>
        </div>

        {/* Speakers — 2×2 grid on md+ */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(['aff', 'neg'] as const).map((side) => (
            <div key={side}>
              <h2
                className={`text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-lg mb-2 ${
                  side === 'aff'
                    ? 'bg-aff-bg dark:bg-aff-bg-d text-aff dark:text-aff-d'
                    : 'bg-neg-bg dark:bg-neg-bg-d text-neg dark:text-neg-d'
                }`}
              >
                {side === 'aff' ? 'Affirmative' : 'Negative'}
              </h2>
              {([`${side}1`, `${side}2`] as const).map((pos) => (
                <SpeakerEvalCard
                  key={pos}
                  pos={pos}
                  speaker={draft.speakers[pos]}
                  students={draft.students}
                  activeCount={draft.activePositions.length}
                  currentRank={draft.rankOrder.indexOf(pos) + 1}
                  locked={draft.speakersLocked}
                  onUpdate={(patch) => draft.updateSpeaker(pos, patch)}
                  onRank={(rank) => draft.assignRank(pos, rank)}
                  onGuideOpen={(category) => {
                    setGuideCategory(category);
                    setGuideOpen(true);
                  }}
                />
              ))}
            </div>
          ))}
        </div>

        {draft.activePositions.length > 1 && (
          <div className="flex justify-end mt-1">
            <button
              type="button"
              className="text-xs text-slate-400 dark:text-slate-500 hover:text-nf-accent dark:hover:text-nf-accent cursor-pointer bg-transparent border-none"
              onClick={draft.suggestByPoints}
            >
              Auto-rank by points
            </button>
          </div>
        )}
        {/* Submit */}
        <div className="mt-6 flex flex-col items-center gap-1.5">
          <button
            className="w-full py-3 bg-nf-blue dark:bg-nf-blue-d hover:bg-nf-blue-mid text-white font-bold rounded-xl cursor-pointer disabled:opacity-40 transition-colors"
            disabled={!draft.canSubmit || draft.submitting}
            onClick={() => void draft.submit()}
          >
            {draft.submitting ? 'Submitting…' : 'Submit Ballot'}
          </button>
          {!draft.canSubmit && (
            <p className="text-xs text-slate-400 dark:text-slate-500">
              {draft.winner === undefined
                ? 'Select a winner to submit.'
                : !draft.allScored
                  ? 'Score all 6 areas for each speaker to submit.'
                  : 'Assign a rank to each speaker to submit.'}
            </p>
          )}
        </div>
      </PageLayout>

      <SpeakerPointGuide
        isOpen={guideOpen}
        onClose={() => setGuideOpen(false)}
        focusCategory={guideCategory}
      />
    </>
  );
}
