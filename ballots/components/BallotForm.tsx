import { useState } from 'react';
import { cn } from 'cnfast';
import { useBallotDraft, useBallotDraftLoader } from '../hooks/useBallotDraft.ts';
import {
  DEBATE_EVENT_LABELS,
  positionLabel,
  positionsForEvent,
  type DebateEvent,
  type Position,
} from '../types.ts';
import { AutoTextarea } from './AutoTextarea.tsx';
import { BackLink } from './BackLink.tsx';
import { PageLayout } from '@/site/PageLayout.tsx';
import { SpeakerEvalCard } from './SpeakerEvalCard.tsx';
import { SpeakerPointGuide } from './SpeakerPointGuide.tsx';
import { SideLabel } from './ui/SideLabel.tsx';

interface Props {
  debateId: string;
  judgeId: string;
  judgeName: string;
}

export function BallotForm({ debateId, judgeId, judgeName: _judgeName }: Props): React.JSX.Element {
  const { initial } = useBallotDraftLoader(debateId);

  return (
    <BallotFormEditor
      key={`${debateId}-${initial.ids.ballotId ?? 'draft'}`}
      debateId={debateId}
      judgeId={judgeId}
      initial={initial}
    />
  );
}

function syncStatusMessage(status: ReturnType<typeof useBallotDraft>['syncStatus']): string {
  switch (status) {
    case 'saved':
      return 'Saved';
    case 'saving':
    case 'pending':
      return 'Saving…';
    case 'error':
      return "Couldn't sync — your notes are safe on this device";
    default:
      return 'Saved';
  }
}

function BallotFormEditor({
  debateId,
  initial,
  judgeId,
}: {
  debateId: string;
  judgeId: string;
  initial: NonNullable<ReturnType<typeof useBallotDraftLoader>['initial']>;
}): React.JSX.Element {
  const [guideOpen, setGuideOpen] = useState(false);
  const [guideCategory, setGuideCategory] = useState<string | undefined>(undefined);

  const draft = useBallotDraft({ initial, debateId, judgeId });
  const event: DebateEvent = draft.debate?.event ?? 'tp';
  const seats = positionsForEvent(event);
  const avatarURLs = Object.fromEntries(
    draft.students
      .filter((s): s is typeof s & { avatarUrl: string } => s.avatarUrl != null)
      .map((s) => [s.id, s.avatarUrl]),
  );

  function seatsForSide(side: 'aff' | 'neg'): Position[] {
    return seats.filter((pos) => pos.startsWith(side));
  }

  return (
    <>
      <PageLayout>
        <div className="mb-0 flex items-center justify-between gap-3">
          <BackLink to="dashboard" label="Dashboard" />
          <button
            type="button"
            className="mb-3 text-sm font-medium text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-1 cursor-pointer bg-transparent hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors"
            onClick={() => setGuideOpen((o) => !o)}
          >
            Speaker Guide
          </button>
        </div>
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {draft.debate && (
            <div className="flex min-w-0 flex-1 items-center gap-3 text-xs text-slate-500 dark:text-slate-400">
              <span>{DEBATE_EVENT_LABELS[event]}</span>
              <span>·</span>
              <span>{draft.debate.date}</span>
              <span>·</span>
              <span>{draft.debate.room}</span>
              {draft.debate.caseTitle && (
                <>
                  <span>·</span>
                  <span className="truncate">{draft.debate.caseTitle}</span>
                </>
              )}
            </div>
          )}
          <div
            className={cn(
              'inline-flex max-w-full flex-wrap items-center gap-x-2 gap-y-1 px-2.5 py-1 text-xs font-medium rounded-full',
              draft.syncStatus === 'error'
                ? 'basis-full bg-amber-100 text-amber-900 dark:bg-amber-900 dark:text-amber-100'
                : draft.syncStatus === 'saving' || draft.syncStatus === 'pending'
                  ? 'ml-auto bg-slate-200 text-slate-700 dark:bg-slate-700 dark:text-slate-200'
                  : 'ml-auto bg-emerald-100 text-emerald-800 dark:bg-emerald-800 dark:text-emerald-100',
            )}
            role="status"
            aria-live="polite"
          >
            <span>{syncStatusMessage(draft.syncStatus)}</span>
            {draft.syncStatus === 'error' && draft.syncError ? (
              <span className="opacity-80">({draft.syncError})</span>
            ) : null}
            {draft.syncStatus === 'error' && (
              <button
                type="button"
                className="font-semibold underline cursor-pointer bg-transparent border-none p-0 text-inherit"
                onClick={draft.retrySync}
              >
                Try again
              </button>
            )}
          </div>
        </div>

        {/* Decision */}
        <div className="bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl px-4 py-3 mb-4">
          <fieldset className="border-none p-0 m-0">
            <legend className="sr-only">Decision</legend>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3">
              {(['aff', 'neg'] as const).map((side) => (
                <label
                  key={side}
                  className={cn(
                    'inline-flex w-full items-center justify-center gap-2 px-4 py-3 border-2 rounded-xl cursor-pointer font-semibold text-sm transition-colors sm:w-auto sm:py-2',
                    draft.winner === side
                      ? side === 'aff'
                        ? 'border-aff bg-aff-bg dark:border-aff-d dark:bg-aff-bg-d text-aff dark:text-aff-d'
                        : 'border-neg bg-neg-bg dark:border-neg-d dark:bg-neg-bg-d text-neg dark:text-neg-d'
                      : 'border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-300 hover:border-slate-300',
                  )}
                >
                  <input
                    className="sr-only"
                    type="radio"
                    name="winner"
                    value={side}
                    checked={draft.winner === side}
                    onChange={() => draft.updateWinner(side)}
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

        {/* Speakers — one column per side; Team Policy has two seats each. */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {(['aff', 'neg'] as const).map((side) => (
            <div key={side}>
              <SideLabel side={side}>{side === 'aff' ? 'Affirmative' : 'Negative'}</SideLabel>
              {seatsForSide(side).map((pos) => (
                <SpeakerEvalCard
                  key={pos}
                  pos={pos}
                  label={event === 'ld' ? 'Debater' : positionLabel(event, pos)}
                  speaker={draft.speakers[pos]}
                  students={draft.students}
                  avatarURLs={avatarURLs}
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
            className="w-full py-3 bg-nf-blue dark:bg-nf-blue-d enabled:hover:bg-nf-blue-mid text-white font-bold rounded-xl cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
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
